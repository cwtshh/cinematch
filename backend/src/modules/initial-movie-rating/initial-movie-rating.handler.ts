import type { FastifyReply, FastifyRequest } from "fastify";
import {
  and,
  count,
  eq,
  inArray,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { db } from "@/infra/database/client";
import {
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
import { searchFirstMovieByTitle } from "@/infra/integrations/tmdb/tmdb.service";

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

  if (!userId) {
    return reply.status(401).send({
      message: "Não autenticado.",
    });
  }

  const limit = parsedQuery.data.limit;

  const preference = await db.query.userPreference.findFirst({
    where: eq(userPreference.userId, userId),
  });

  const preferredGenres = await db
    .select({
      genreId: userPreferenceGenre.genreId,
    })
    .from(userPreferenceGenre)
    .where(eq(userPreferenceGenre.userId, userId));

  const ratedMovies = await db
    .select({
      movieId: userMovieRating.movieId,
    })
    .from(userMovieRating)
    .where(eq(userMovieRating.userId, userId));

  const preferredGenreIds = preferredGenres.map((item) => item.genreId);
  const ratedMovieIds = ratedMovies.map((item) => item.movieId);

  const filters: SQL[] = [];

  if (preferredGenreIds.length > 0) {
    filters.push(inArray(movieGenre.genreId, preferredGenreIds));
  }

  if (preference?.era === "before-1980") {
    filters.push(sql`${movie.releaseYear} < 1980`);
  }

  if (preference?.era === "80s-90s") {
    filters.push(
      and(
        sql`${movie.releaseYear} >= 1980`,
        sql`${movie.releaseYear} <= 1999`,
      )!,
    );
  }

  if (preference?.era === "2000-plus") {
    filters.push(sql`${movie.releaseYear} >= 2000`);
  }

  if (ratedMovieIds.length > 0) {
    filters.push(notInArray(movie.id, ratedMovieIds));
  }

  const rows = await db
    .select({
      id: movie.id,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
    })
    .from(movie)
    .innerJoin(movieGenre, eq(movieGenre.movieId, movie.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .groupBy(movie.id, movie.title, movie.releaseYear, movie.popularityBucket)
    .orderBy(sql`random()`)
    .limit(limit);

  const TMDB_BATCH_SIZE = 3;
  const items = [];
  for (let i = 0; i < rows.length; i += TMDB_BATCH_SIZE) {
    const batch = rows.slice(i, i + TMDB_BATCH_SIZE);
    const enriched = await Promise.all(
      batch.map(async (row) => {
        let posterUrl: string | null = null;
        try {
          const tmdb = await searchFirstMovieByTitle({
            title: row.title,
            year: row.releaseYear ?? undefined,
          });
          posterUrl = tmdb?.posterUrl ?? null;
        } catch {
          request.log.warn(`TMDB falhou para "${row.title}", seguindo sem poster`);
        }
        return { ...row, posterUrl };
      }),
    );
    items.push(...enriched);
  }

  return reply.status(200).send({
    items,
  });
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
