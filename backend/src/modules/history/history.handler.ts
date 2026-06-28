import type { FastifyReply, FastifyRequest } from "fastify";
import { eq, inArray } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  moviePosterMap,
  recommendedFeed,
  recommendedFeedItem,
} from "@/infra/database/drizzle/schema";
import { buildTmdbPosterUrl } from "@/infra/integrations/tmdb/tmdb-image";

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

  // Busca todos os feed items do usuário (todos os feeds, não só o ativo)
  // Faz leftJoin com movie_poster_map para evitar chamadas à API do TMDB
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
      posterPath: moviePosterMap.posterPath,
      backdropPath: moviePosterMap.backdropPath,
    })
    .from(recommendedFeedItem)
    .innerJoin(
      recommendedFeed,
      eq(recommendedFeed.id, recommendedFeedItem.feedId),
    )
    .innerJoin(movie, eq(movie.id, recommendedFeedItem.movieId))
    .leftJoin(moviePosterMap, eq(moviePosterMap.movieId, movie.id))
    .where(eq(recommendedFeed.userId, userId));

  // Ordena por: avaliados → ratedAt desc; acessados → feedGeneratedAt desc
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
    current.push({ slug: relation.slug, label: relation.label });
    genresByMovieId.set(relation.movieId, current);
  }

  // Sem chamadas externas: poster já vem do cache no banco
  const enrichedItems = allItems.map((item) => ({
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
    posterPath: item.posterPath ?? null,
    posterUrl: buildTmdbPosterUrl(item.posterPath ?? null, "w500"),
    backdropPath: item.backdropPath ?? null,
    backdropUrl: buildTmdbPosterUrl(item.backdropPath ?? null, "original"),
    genres: genresByMovieId.get(item.id) ?? [],
  }));

  // "Acessados" = todos os itens (o usuário os recebeu no feed)
  const accessed = enrichedItems;

  // "Avaliados" = apenas os que têm userRating, ordenados por ratedAt desc
  const rated = enrichedItems
    .filter((item) => item.status === "rated" && item.ratedAt !== null)
    .sort(
      (a, b) =>
        new Date(b.ratedAt!).getTime() - new Date(a.ratedAt!).getTime(),
    );

  return reply.status(200).send({ accessed, rated });
}