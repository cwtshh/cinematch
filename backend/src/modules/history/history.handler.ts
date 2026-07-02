import type { FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  recommendedFeed,
  recommendedFeedItem,
  userWatchlist,
} from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitleWithFallback } from "@/infra/integrations/tmdb/tmdb.service";

const PAGE_SIZE = 20;

type RawItem = {
  feedItemId: string;
  feedId: string;
  rank: number;
  status: string;
  userRating: number | null;
  ratedAt: Date | null;
  id: string;
  sourceMovieId: number;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  feedGeneratedAt: Date;
  tmdbTitle: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
};

async function enrichWithTmdbAndGenres(items: RawItem[], watchlistIds: Set<string>) {
  if (items.length === 0) return [];

  const movieIds = [...new Set(items.map((item) => item.id))];

  const genreRelations = await db
    .select({
      movieId: movieGenre.movieId,
      slug: genre.slug,
      label: genre.label,
    })
    .from(movieGenre)
    .innerJoin(genre, eq(genre.id, movieGenre.genreId))
    .where(inArray(movieGenre.movieId, movieIds));

  const genresByMovieId = new Map<string, Array<{ slug: string; label: string }>>();
  for (const rel of genreRelations) {
    const curr = genresByMovieId.get(rel.movieId) ?? [];
    curr.push({ slug: rel.slug, label: rel.label });
    genresByMovieId.set(rel.movieId, curr);
  }

  return Promise.all(
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
        ...tmdbData,
        releaseYear: item.releaseYear,
        popularityBucket: item.popularityBucket,
        inWatchlist: watchlistIds.has(item.id),
        genres: genresByMovieId.get(item.id) ?? [],
      };
    }),
  );
}

export async function getHistoryHandler(
  request: FastifyRequest<{ Querystring: { page?: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  const userId = session?.user.id;

  if (!userId) {
    return reply.status(401).send({ message: "Não autenticado." });
  }

  const page = Math.max(1, Number(request.query.page ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const baseSelect = {
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
    tmdbTitle: movie.tmdbTitle,
    overview: movie.overview,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
  };

  const [accessedRaw, ratedRaw, watchlistRows] = await Promise.all([
    db
      .select(baseSelect)
      .from(recommendedFeedItem)
      .innerJoin(recommendedFeed, eq(recommendedFeed.id, recommendedFeedItem.feedId))
      .innerJoin(movie, eq(movie.id, recommendedFeedItem.movieId))
      .where(eq(recommendedFeed.userId, userId))
      .orderBy(desc(recommendedFeed.generatedAt), desc(recommendedFeedItem.ratedAt))
      .limit(PAGE_SIZE + 1)
      .offset(offset),

    db
      .select(baseSelect)
      .from(recommendedFeedItem)
      .innerJoin(recommendedFeed, eq(recommendedFeed.id, recommendedFeedItem.feedId))
      .innerJoin(movie, eq(movie.id, recommendedFeedItem.movieId))
      .where(
        and(
          eq(recommendedFeed.userId, userId),
          eq(recommendedFeedItem.status, "rated"),
        ),
      )
      .orderBy(desc(recommendedFeedItem.ratedAt))
      .limit(200),

    db
      .select({ movieId: userWatchlist.movieId })
      .from(userWatchlist)
      .where(eq(userWatchlist.userId, userId)),
  ]);

  const watchlistIds = new Set(watchlistRows.map((r) => r.movieId));

  const hasMore = accessedRaw.length > PAGE_SIZE;
  const accessedPage = (hasMore ? accessedRaw.slice(0, PAGE_SIZE) : accessedRaw).sort((a, b) => {
    const dateA = a.ratedAt ?? a.feedGeneratedAt;
    const dateB = b.ratedAt ?? b.feedGeneratedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const [accessed, rated] = await Promise.all([
    enrichWithTmdbAndGenres(accessedPage, watchlistIds),
    enrichWithTmdbAndGenres(ratedRaw, watchlistIds),
  ]);

  return reply.status(200).send({ accessed, rated, hasMore, page });
}
