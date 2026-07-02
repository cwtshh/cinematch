import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, inArray, sql } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  recommendedFeed,
  recommendedFeedItem,
  userPreference,
  userPreferenceGenre,
  userWatchlist,
  userDismissedMovie,
} from "@/infra/database/drizzle/schema";
import {
  rateRecommendationBodySchema,
  rateRecommendationParamsSchema,
  refreshRecommendationsBodySchema,
} from "./recommendations.schema";
import { rateRecommendation } from "./rate-recommendation";
import { searchFirstMovieByTitleWithFallback } from "@/infra/integrations/tmdb/tmdb.service";
import { generateAndSaveRecommendationsForUser } from "@/services/ai-inference-service/generate-and-save-recommendations";

function buildExplanation(
  movieGenres: Array<{ slug: string; label: string }>,
  preferredSlugs: Set<string>,
  releaseYear: number | null,
  popularityBucket: string | null,
  era: string | null,
  popularity: string | null,
): string {
  const matchedGenres = movieGenres.filter((g) => preferredSlugs.has(g.slug));

  if (matchedGenres.length > 0) {
    const labels = matchedGenres.slice(0, 2).map((g) => g.label);
    return `Baseado no seu interesse em ${labels.join(" e ")}`;
  }

  if (era && releaseYear) {
    if (era === "before-1980" && releaseYear < 1980) {
      return "Clássico do cinema que combina com seu gosto por filmes antigos";
    }
    if (era === "80s-90s" && releaseYear >= 1980 && releaseYear <= 1999) {
      return "Da época que você curte: anos 80 e 90";
    }
    if (era === "2000-plus" && releaseYear >= 2000) {
      return "Lançamento moderno compatível com suas preferências";
    }
  }

  if (popularity === "popular" && popularityBucket === "popular") {
    return "Um dos títulos mais populares do catálogo";
  }
  if (popularity === "hidden-gems" && popularityBucket === "hidden-gem") {
    return "Uma joia escondida que poucas pessoas conhecem";
  }

  return "Recomendado com base nas suas avaliações";
}

export async function getActiveRecommendationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  const userId = session?.user.id;

  if (!userId) {
    return reply.status(401).send({
      message: "Não autenticado.",
    });
  }

  const feed = await db.query.recommendedFeed.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.userId, userId), eq(table.status, "active")),
    orderBy: (table, { desc }) => [desc(table.generatedAt)],
  });

  if (!feed) {
    return reply.status(404).send({
      message: "Nenhum feed de recomendações ativo encontrado.",
    });
  }

  const items = await db
    .select({
      feedItemId: recommendedFeedItem.id,
      feedId: recommendedFeedItem.feedId,
      rank: recommendedFeedItem.rank,
      status: recommendedFeedItem.status,
      userRating: recommendedFeedItem.userRating,
      ratedAt: recommendedFeedItem.ratedAt,
      id: movie.id,
      sourceMovieId: movie.sourceMovieId,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
      tmdbTitle: movie.tmdbTitle,
      overview: movie.overview,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
    })
    .from(recommendedFeedItem)
    .innerJoin(
      recommendedFeed,
      eq(recommendedFeed.id, recommendedFeedItem.feedId),
    )
    .innerJoin(movie, eq(movie.id, recommendedFeedItem.movieId))
    .where(
      and(eq(recommendedFeed.id, feed.id), eq(recommendedFeed.userId, userId)),
    )
    .orderBy(recommendedFeedItem.rank);

  const movieIds = items.map((item) => item.id);

  // Busca tudo em paralelo: gêneros, preferências do usuário, watchlist, dismissed
  const [genreRelations, prefRow, genreRows, watchlistRows, dismissedRows] = await Promise.all([
    movieIds.length > 0
      ? db
          .select({
            movieId: movieGenre.movieId,
            slug: genre.slug,
            label: genre.label,
          })
          .from(movieGenre)
          .innerJoin(genre, eq(genre.id, movieGenre.genreId))
          .where(inArray(movieGenre.movieId, movieIds))
      : Promise.resolve([]),

    db
      .select({ era: userPreference.era, popularity: userPreference.popularity })
      .from(userPreference)
      .where(eq(userPreference.userId, userId))
      .limit(1),

    db
      .select({ slug: genre.slug })
      .from(userPreferenceGenre)
      .innerJoin(genre, eq(genre.id, userPreferenceGenre.genreId))
      .where(eq(userPreferenceGenre.userId, userId)),

    movieIds.length > 0
      ? db
          .select({ movieId: userWatchlist.movieId })
          .from(userWatchlist)
          .where(and(eq(userWatchlist.userId, userId), inArray(userWatchlist.movieId, movieIds)))
      : Promise.resolve([]),

    movieIds.length > 0
      ? db
          .select({ movieId: userDismissedMovie.movieId })
          .from(userDismissedMovie)
          .where(and(eq(userDismissedMovie.userId, userId), inArray(userDismissedMovie.movieId, movieIds)))
      : Promise.resolve([]),
  ]);

  const pref = prefRow[0] ?? null;
  const preferredSlugs = new Set(genreRows.map((r) => r.slug));
  const watchlistIds = new Set(watchlistRows.map((r) => r.movieId));
  const dismissedIds = new Set(dismissedRows.map((r) => r.movieId));

  const genresByMovieId = new Map<
    string,
    Array<{ slug: string; label: string }>
  >();

  for (const relation of genreRelations) {
    const current = genresByMovieId.get(relation.movieId) ?? [];
    current.push({ slug: relation.slug, label: relation.label });
    genresByMovieId.set(relation.movieId, current);
  }

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let tmdbData = {
        tmdbTitle: item.tmdbTitle ?? null,
        overview: item.overview ?? null,
        posterUrl: item.posterUrl ?? null,
        backdropUrl: item.backdropUrl ?? null,
      };

      if (!tmdbData.tmdbTitle && !tmdbData.overview && !tmdbData.posterUrl) {
        try {
          const tmdb = await searchFirstMovieByTitleWithFallback({
            title: item.title,
            year: item.releaseYear ?? undefined,
          });
          if (tmdb) {
            tmdbData = {
              tmdbTitle: tmdb.title ?? null,
              overview: tmdb.overview ?? null,
              posterUrl: tmdb.posterUrl ?? null,
              backdropUrl: tmdb.backdropUrl ?? null,
            };
            db.update(movie).set(tmdbData).where(eq(movie.id, item.id)).catch(() => {});
          }
        } catch {
          // continua sem dados TMDB
        }
      }

      const movieGenres = genresByMovieId.get(item.id) ?? [];
      const explanation = buildExplanation(
        movieGenres,
        preferredSlugs,
        item.releaseYear,
        item.popularityBucket,
        pref?.era ?? null,
        pref?.popularity ?? null,
      );

      return {
        ...item,
        ...tmdbData,
        genres: movieGenres,
        explanation,
        inWatchlist: watchlistIds.has(item.id),
        isDismissed: dismissedIds.has(item.id),
      };
    }),
  );

  return reply.status(200).send({
    feed,
    items: enrichedItems,
  });
}

export async function rateRecommendationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedParams = rateRecommendationParamsSchema.safeParse(request.params);
  const parsedBody = rateRecommendationBodySchema.safeParse(request.body);

  if (!parsedParams.success) {
    return reply.status(400).send({
      message: "Parâmetros inválidos.",
      issues: parsedParams.error.flatten(),
    });
  }

  if (!parsedBody.success) {
    return reply.status(400).send({
      message: "Body inválido.",
      issues: parsedBody.error.flatten(),
    });
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  const userId = session?.user.id;

  if (!userId) {
    return reply.status(401).send({
      message: "Não autenticado.",
    });
  }

  const item = await rateRecommendation({
    userId,
    feedItemId: parsedParams.data.feedItemId,
    rating: parsedBody.data.rating,
  });

  if (!item) {
    return reply.status(404).send({
      message: "Item de recomendação não encontrado.",
    });
  }

  return reply.status(200).send({
    message: "Avaliação salva com sucesso.",
    item,
  });
}

export async function refreshRecommendationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedBody = refreshRecommendationsBodySchema.safeParse(request.body);

  if (!parsedBody.success) {
    return reply.status(400).send({
      message: "Body inválido.",
      issues: parsedBody.error.flatten(),
    });
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  const userId = session?.user.id;

  if (!userId) {
    return reply.status(401).send({
      message: "Não autenticado.",
    });
  }

  try {
    const recommendations = await generateAndSaveRecommendationsForUser({
      userId,
      nRecommendations: parsedBody.data?.limit ?? 10,
    });

    return reply.status(200).send({
      message: "Novas recomendações geradas com sucesso.",
      recommendationsGenerated: true,
      recommendationsError: null,
      recommendations,
    });
  } catch (error) {
    request.log.error(error);

    return reply.status(500).send({
      message: "Não foi possível gerar novas recomendações agora.",
      recommendationsGenerated: false,
      recommendationsError: "Não foi possível gerar novas recomendações agora.",
      recommendations: null,
    });
  }
}
