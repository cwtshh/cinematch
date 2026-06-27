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
} from "@/infra/database/drizzle/schema";
import {
  rateRecommendationBodySchema,
  rateRecommendationParamsSchema,
} from "./recommendations.schema";
import { rateRecommendation } from "./rate-recommendation";
import { searchFirstMovieByTitle } from "@/infra/integrations/tmdb/tmdb.service";

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

  const genreRelations =
    movieIds.length > 0
      ? await db
          .select({
            movieId: movieGenre.movieId,
            slug: genre.slug,
            label: genre.label,
          })
          .from(movieGenre)
          .innerJoin(genre, eq(genre.id, movieGenre.genreId))
          .where(inArray(movieGenre.movieId, movieIds))
      : [];

  const genresByMovieId = new Map<
    string,
    Array<{ slug: string; label: string }>
  >();

  for (const relation of genreRelations) {
    const current = genresByMovieId.get(relation.movieId) ?? [];
    current.push({
      slug: relation.slug,
      label: relation.label,
    });
    genresByMovieId.set(relation.movieId, current);
  }

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const tmdbMovie = await searchFirstMovieByTitle({
        title: item.title,
        year: item.releaseYear ?? undefined,
      });

      return {
        ...item,
        posterPath: tmdbMovie?.posterPath ?? null,
        posterUrl: tmdbMovie?.posterUrl ?? null,
        backdropPath: tmdbMovie?.backdropPath ?? null,
        backdropUrl: tmdbMovie?.backdropUrl ?? null,
        genres: genresByMovieId.get(item.id) ?? [],
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
