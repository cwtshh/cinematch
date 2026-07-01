import type { FastifyReply, FastifyRequest } from "fastify";
import { desc, eq, inArray } from "drizzle-orm";
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
import { searchFirstMovieByTitle } from "@/infra/integrations/tmdb/tmdb.service";

export async function getHistoryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  const userId = session?.user.id;

  if (!userId) {
    return reply.status(401).send({ message: "Não autenticado." });
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
      feedGeneratedAt: recommendedFeed.generatedAt,
    })
    .from(recommendedFeedItem)
    .innerJoin(
      recommendedFeed,
      eq(recommendedFeed.id, recommendedFeedItem.feedId),
    )
    .innerJoin(movie, eq(movie.id, recommendedFeedItem.movieId))
    .where(eq(recommendedFeed.userId, userId))
    .orderBy(desc(recommendedFeed.generatedAt), desc(recommendedFeedItem.ratedAt))
    .limit(200);

  const allItems = items.sort((a, b) => {
    const dateA = a.ratedAt ?? a.feedGeneratedAt;
    const dateB = b.ratedAt ?? b.feedGeneratedAt;

    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const movieIds = [...new Set(allItems.map((item) => item.id))];

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

  const TMDB_BATCH_SIZE = 3;
  const enrichedItems = [];

  for (let i = 0; i < allItems.length; i += TMDB_BATCH_SIZE) {
    const batch = allItems.slice(i, i + TMDB_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        let tmdbMovie = null;

        try {
          tmdbMovie = await searchFirstMovieByTitle({
            title: item.title,
            year: item.releaseYear ?? undefined,
          });
        } catch {
          request.log.warn(
            `TMDB falhou para "${item.title}", seguindo sem poster`,
          );
        }

        return {
          feedItemId: item.feedItemId,
          feedId: item.feedId,
          rank: item.rank,
          status: item.status,
          userRating: item.userRating,
          ratedAt: item.ratedAt,
          accessedAt: item.feedGeneratedAt,
          id: item.id,
          sourceMovieId: item.sourceMovieId,
          title: item.title,
          releaseYear: item.releaseYear,
          popularityBucket: item.popularityBucket,
          posterPath: tmdbMovie?.posterPath ?? null,
          posterUrl: tmdbMovie?.posterUrl ?? null,
          backdropPath: tmdbMovie?.backdropPath ?? null,
          backdropUrl: tmdbMovie?.backdropUrl ?? null,
          genres: genresByMovieId.get(item.id) ?? [],
        };
      }),
    );

    enrichedItems.push(...batchResults);
  }

  const accessed = enrichedItems;

  const rated = enrichedItems
    .filter((item) => item.status === "rated" && item.ratedAt !== null)
    .sort(
      (a, b) => new Date(b.ratedAt!).getTime() - new Date(a.ratedAt!).getTime(),
    );

  return reply.status(200).send({
    accessed,
    rated,
  });
}
