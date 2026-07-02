import type { FastifyReply, FastifyRequest } from "fastify";
import { and, avg, count, eq, sql } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  userMovieRating,
  userWatchlist,
  userDismissedMovie,
} from "@/infra/database/drizzle/schema";

export async function getStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const [totalRated, avgRating, ratingDist, topGenres, eraStats, watchlistCount, dismissedCount] =
    await Promise.all([
      // total avaliados
      db
        .select({ count: count() })
        .from(userMovieRating)
        .where(eq(userMovieRating.userId, userId)),

      // média
      db
        .select({ avg: avg(userMovieRating.rating) })
        .from(userMovieRating)
        .where(eq(userMovieRating.userId, userId)),

      // distribuição 1-5
      db
        .select({
          rating: sql<number>`round(${userMovieRating.rating})`,
          count: count(),
        })
        .from(userMovieRating)
        .where(eq(userMovieRating.userId, userId))
        .groupBy(sql`round(${userMovieRating.rating})`),

      // top gêneros (por qtd de avaliações)
      db
        .select({
          slug: genre.slug,
          label: genre.label,
          count: count(),
          avgRating: avg(userMovieRating.rating),
        })
        .from(userMovieRating)
        .innerJoin(movie, eq(movie.id, userMovieRating.movieId))
        .innerJoin(movieGenre, eq(movieGenre.movieId, movie.id))
        .innerJoin(genre, eq(genre.id, movieGenre.genreId))
        .where(eq(userMovieRating.userId, userId))
        .groupBy(genre.slug, genre.label)
        .orderBy(sql`count(*) desc`)
        .limit(5),

      // distribuição de eras
      db
        .select({
          era: sql<string>`case
            when ${movie.releaseYear} < 1980 then 'Antes de 1980'
            when ${movie.releaseYear} between 1980 and 1999 then 'Anos 80-90'
            when ${movie.releaseYear} >= 2000 then 'Anos 2000+'
            else 'Desconhecido'
          end`,
          count: count(),
          avgRating: avg(userMovieRating.rating),
        })
        .from(userMovieRating)
        .innerJoin(movie, eq(movie.id, userMovieRating.movieId))
        .where(and(eq(userMovieRating.userId, userId)))
        .groupBy(
          sql`case
            when ${movie.releaseYear} < 1980 then 'Antes de 1980'
            when ${movie.releaseYear} between 1980 and 1999 then 'Anos 80-90'
            when ${movie.releaseYear} >= 2000 then 'Anos 2000+'
            else 'Desconhecido'
          end`,
        ),

      // watchlist count
      db.select({ count: count() }).from(userWatchlist).where(eq(userWatchlist.userId, userId)),

      // dismissed count
      db.select({ count: count() }).from(userDismissedMovie).where(eq(userDismissedMovie.userId, userId)),
    ]);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of ratingDist) {
    const key = Number(row.rating);
    if (key >= 1 && key <= 5) distribution[key] = row.count;
  }

  return reply.status(200).send({
    totalRated: totalRated[0]?.count ?? 0,
    avgRating: avgRating[0]?.avg ? Number(Number(avgRating[0].avg).toFixed(2)) : null,
    ratingDistribution: distribution,
    topGenres: topGenres.map((g) => ({
      slug: g.slug,
      label: g.label,
      count: g.count,
      avgRating: g.avgRating ? Number(Number(g.avgRating).toFixed(2)) : null,
    })),
    eraStats: eraStats.map((e) => ({
      era: e.era,
      count: e.count,
      avgRating: e.avgRating ? Number(Number(e.avgRating).toFixed(2)) : null,
    })),
    watchlistCount: watchlistCount[0]?.count ?? 0,
    dismissedCount: dismissedCount[0]?.count ?? 0,
  });
}
