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
} from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitle } from "@/infra/integrations/tmdb/tmdb.service";

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
};

async function enrichWithTmdbAndGenres(items: RawItem[]) {
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
      let tmdbMovie = null;
      try {
        tmdbMovie = await searchFirstMovieByTitle({
          title: item.title,
          year: item.releaseYear ?? undefined,
        });
      } catch {
        // continua sem poster
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
  };

  // ── Acessados: paginado por data de geração do feed ───────────────────────
  const accessedRaw = await db
    .select(baseSelect)
    .from(recommendedFeedItem)
    .innerJoin(recommendedFeed, eq(recommendedFeed.id, recommendedFeedItem.feedId))
    .innerJoin(movie, eq(movie.id, recommendedFeedItem.movieId))
    .where(eq(recommendedFeed.userId, userId))
    .orderBy(desc(recommendedFeed.generatedAt), desc(recommendedFeedItem.ratedAt))
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = accessedRaw.length > PAGE_SIZE;
  const accessedPage = (hasMore ? accessedRaw.slice(0, PAGE_SIZE) : accessedRaw).sort((a, b) => {
    const dateA = a.ratedAt ?? a.feedGeneratedAt;
    const dateB = b.ratedAt ?? b.feedGeneratedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // ── Avaliados: query separada sem paginação (todos os filmes avaliados) ───
  const ratedRaw = await db
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
    .limit(200);

  // ── Enriquecer com TMDB + gêneros em paralelo ─────────────────────────────
  const [accessed, rated] = await Promise.all([
    enrichWithTmdbAndGenres(accessedPage),
    enrichWithTmdbAndGenres(ratedRaw),
  ]);

  return reply.status(200).send({ accessed, rated, hasMore, page });
}
