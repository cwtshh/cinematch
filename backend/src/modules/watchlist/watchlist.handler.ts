import type { FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";

import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  userMovieRating,
  userWatchlist,
} from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitleWithFallback } from "@/infra/integrations/tmdb/tmdb.service";

const paramsSchema = z.object({ movieId: z.string().uuid() });

export async function addToWatchlistHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) return reply.status(400).send({ message: "Parâmetros inválidos." });

  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const { movieId } = parsed.data;

  const [movieRow] = await db.select({ id: movie.id }).from(movie).where(eq(movie.id, movieId)).limit(1);
  if (!movieRow) return reply.status(404).send({ message: "Filme não encontrado." });

  await db
    .insert(userWatchlist)
    .values({ userId, movieId })
    .onConflictDoNothing();

  return reply.status(200).send({ movieId, inWatchlist: true });
}

export async function removeFromWatchlistHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) return reply.status(400).send({ message: "Parâmetros inválidos." });

  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const { movieId } = parsed.data;

  await db
    .delete(userWatchlist)
    .where(and(eq(userWatchlist.userId, userId), eq(userWatchlist.movieId, movieId)));

  return reply.status(200).send({ movieId, inWatchlist: false });
}

export async function getWatchlistHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const watchlistRows = await db
    .select({
      movieId: userWatchlist.movieId,
      addedAt: userWatchlist.addedAt,
      id: movie.id,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
      tmdbTitle: movie.tmdbTitle,
      overview: movie.overview,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
    })
    .from(userWatchlist)
    .innerJoin(movie, eq(movie.id, userWatchlist.movieId))
    .where(eq(userWatchlist.userId, userId))
    .orderBy(desc(userWatchlist.addedAt));

  if (watchlistRows.length === 0) {
    return reply.status(200).send({ items: [] });
  }

  const movieIds = watchlistRows.map((r) => r.id);

  const [genreRelations, ratingRows] = await Promise.all([
    db
      .select({ movieId: movieGenre.movieId, slug: genre.slug, label: genre.label })
      .from(movieGenre)
      .innerJoin(genre, eq(genre.id, movieGenre.genreId))
      .where(inArray(movieGenre.movieId, movieIds)),
    db
      .select({ movieId: userMovieRating.movieId, rating: userMovieRating.rating })
      .from(userMovieRating)
      .where(and(eq(userMovieRating.userId, userId), inArray(userMovieRating.movieId, movieIds))),
  ]);

  const genresByMovieId = new Map<string, { slug: string; label: string }[]>();
  for (const rel of genreRelations) {
    const list = genresByMovieId.get(rel.movieId) ?? [];
    list.push({ slug: rel.slug, label: rel.label });
    genresByMovieId.set(rel.movieId, list);
  }

  const ratingByMovieId = new Map<string, number>();
  for (const r of ratingRows) {
    ratingByMovieId.set(r.movieId, r.rating);
  }

  const items = await Promise.all(
    watchlistRows.map(async (row) => {
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
          // continua sem dados TMDB
        }
      }

      return {
        id: row.id,
        title: row.title,
        releaseYear: row.releaseYear,
        popularityBucket: row.popularityBucket,
        addedAt: row.addedAt,
        ...tmdbData,
        genres: genresByMovieId.get(row.id) ?? [],
        userRating: ratingByMovieId.get(row.id) ?? null,
        inWatchlist: true,
      };
    }),
  );

  return reply.status(200).send({ items });
}
