import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  user,
  userMovieRating,
  userPreference,
  userPreferenceGenre,
} from "@/infra/database/drizzle/schema";

import {
  getMoviesToRateQuerySchema,
  submitInitialMovieRatingsBodySchema,
} from "./initial-movie-rating.schema";
import { auth } from "@/infra/auth/auth";
import { generateAndSaveRecommendationsForUser } from "@/services/ai-inference-service/generate-and-save-recommendations";
import { searchFirstMovieByTitleWithFallback } from "@/infra/integrations/tmdb/tmdb.service";

const TARGET = 20;
const PER_GENRE_POPULAR = 4;

type MovieRow = {
  id: string;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  tmdbTitle: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
};

function buildEraConditions(era: string | null | undefined) {
  if (era === "before-1980") return [sql`${movie.releaseYear} < 1980`];
  if (era === "80s-90s") return [sql`${movie.releaseYear} >= 1980`, sql`${movie.releaseYear} <= 1999`];
  if (era === "2000-plus") return [sql`${movie.releaseYear} >= 2000`];
  return [];
}

const MOVIE_TMDB_SELECT = {
  id: movie.id,
  title: movie.title,
  releaseYear: movie.releaseYear,
  popularityBucket: movie.popularityBucket,
  tmdbTitle: movie.tmdbTitle,
  overview: movie.overview,
  posterUrl: movie.posterUrl,
  backdropUrl: movie.backdropUrl,
} as const;

export async function getMoviesToRateHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedQuery = getMoviesToRateQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    return reply.status(400).send({
      message: "Query inválida.",
      issues: parsedQuery.error.flatten(),
    });
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const preference = await db.query.userPreference.findFirst({
    where: eq(userPreference.userId, userId),
  });

  const preferredGenres = await db
    .select({ genreId: userPreferenceGenre.genreId })
    .from(userPreferenceGenre)
    .where(eq(userPreferenceGenre.userId, userId));

  const ratedMovies = await db
    .select({ movieId: userMovieRating.movieId })
    .from(userMovieRating)
    .where(eq(userMovieRating.userId, userId));

  const preferredGenreIds = preferredGenres.map((g) => g.genreId);
  const ratedMovieIds = ratedMovies.map((r) => r.movieId);
  const eraConditions = buildEraConditions(preference?.era);

  // ── Fase 1: 4 filmes POPULARES por gênero preferido ──────────────────────
  const selectedIds = new Set<string>();
  const rows: MovieRow[] = [];

  if (preferredGenreIds.length > 0) {
    await Promise.all(
      preferredGenreIds.map(async (genreId) => {
        const conditions = [
          eq(movieGenre.genreId, genreId),
          eq(movie.popularityBucket, "popular"),
          ...eraConditions,
          ...(ratedMovieIds.length > 0 ? [notInArray(movie.id, ratedMovieIds)] : []),
        ];

        const genreMovies = await db
          .select(MOVIE_TMDB_SELECT)
          .from(movie)
          .innerJoin(movieGenre, eq(movieGenre.movieId, movie.id))
          .where(and(...conditions))
          .groupBy(
            movie.id, movie.title, movie.releaseYear, movie.popularityBucket,
            movie.tmdbTitle, movie.overview, movie.posterUrl, movie.backdropUrl,
          )
          .orderBy(sql`random()`)
          .limit(PER_GENRE_POPULAR);

        for (const m of genreMovies) {
          if (!selectedIds.has(m.id)) {
            selectedIds.add(m.id);
            rows.push(m);
          }
        }
      }),
    );
  }

  // ── Fase 2: complementa até TARGET com mais populares dos gêneros ─────────
  if (rows.length < TARGET && preferredGenreIds.length > 0) {
    const fillConditions = [
      inArray(movieGenre.genreId, preferredGenreIds),
      ...eraConditions,
      ...(selectedIds.size > 0 ? [notInArray(movie.id, [...selectedIds])] : []),
      ...(ratedMovieIds.length > 0 ? [notInArray(movie.id, ratedMovieIds)] : []),
    ];

    const fillMovies = await db
      .select(MOVIE_TMDB_SELECT)
      .from(movie)
      .innerJoin(movieGenre, eq(movieGenre.movieId, movie.id))
      .where(and(...fillConditions))
      .groupBy(
        movie.id, movie.title, movie.releaseYear, movie.popularityBucket,
        movie.tmdbTitle, movie.overview, movie.posterUrl, movie.backdropUrl,
      )
      .orderBy(sql`(${movie.popularityBucket} = 'popular') desc`, sql`random()`)
      .limit(TARGET - rows.length);

    rows.push(...fillMovies);
  }

  // baralha para não agrupar por gênero na UI
  rows.sort(() => Math.random() - 0.5);

  // ── Busca gêneros de todos os filmes em uma query só ─────────────────────
  const movieIds = rows.map((r) => r.id);
  const genreRelations = movieIds.length > 0
    ? await db
        .select({ movieId: movieGenre.movieId, slug: genre.slug, label: genre.label })
        .from(movieGenre)
        .innerJoin(genre, eq(genre.id, movieGenre.genreId))
        .where(inArray(movieGenre.movieId, movieIds))
    : [];

  const genresByMovieId = new Map<string, { slug: string; label: string }[]>();
  for (const rel of genreRelations) {
    const list = genresByMovieId.get(rel.movieId) ?? [];
    list.push({ slug: rel.slug, label: rel.label });
    genresByMovieId.set(rel.movieId, list);
  }

  // ── Enriquece com TMDB (usa cache do DB quando disponível) ───────────────
  const items = await Promise.all(
    rows.map(async (row) => {
      let tmdbData = {
        tmdbTitle: row.tmdbTitle ?? null,
        overview: row.overview ?? null,
        posterUrl: row.posterUrl ?? null,
        backdropUrl: row.backdropUrl ?? null,
      };

      if (!tmdbData.tmdbTitle && !tmdbData.overview && !tmdbData.posterUrl) {
        try {
          const tmdb = await searchFirstMovieByTitleWithFallback({
            title: row.title,
            year: row.releaseYear ?? undefined,
          });
          if (tmdb) {
            tmdbData = {
              tmdbTitle: tmdb.title ?? null,
              overview: tmdb.overview ?? null,
              posterUrl: tmdb.posterUrl ?? null,
              backdropUrl: tmdb.backdropUrl ?? null,
            };
            db.update(movie).set(tmdbData).where(eq(movie.id, row.id)).catch(() => {});
          }
        } catch {
          // continua sem poster/sinopse
        }
      }

      return { ...row, ...tmdbData, genres: genresByMovieId.get(row.id) ?? [] };
    }),
  );

  return reply.status(200).send({ items });
}

export async function submitInitialMovieRatingsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedBody = submitInitialMovieRatingsBodySchema.safeParse(
    request.body,
  );

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

  const validRatings = parsedBody.data.ratings.filter(
    (item) => item.rating > 0,
  );

  if (validRatings.length > 0) {
    await db
      .insert(userMovieRating)
      .values(
        validRatings.map((item) => ({
          userId,
          movieId: item.movieId,
          rating: item.rating,
        })),
      )
      .onConflictDoUpdate({
        target: [userMovieRating.userId, userMovieRating.movieId],
        set: {
          rating: sql`excluded.rating`,
          updatedAt: sql`now()`,
        },
      });
  }

  await db
    .update(user)
    .set({
      hasCompletedInitialMovieRating: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  let recommendations: Awaited<
    ReturnType<typeof generateAndSaveRecommendationsForUser>
  > | null = null;
  let recommendationsGenerated = false;
  let recommendationsError: string | null = null;

  try {
    recommendations = await generateAndSaveRecommendationsForUser({
      userId,
      nRecommendations: 20,
    });
    recommendationsGenerated = true;
  } catch (error) {
    request.log.error(error);
    recommendationsError =
      "As avaliações foram salvas, mas não foi possível gerar recomendações agora.";
  }

  return reply.status(200).send({
    savedCount: validRatings.length,
    totalRated: validRatings.length,
    hasCompletedInitialMovieRating: true,
    recommendationsGenerated,
    recommendationsError,
    recommendations,
  });
}
