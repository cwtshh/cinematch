import { eq, inArray } from "drizzle-orm";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  moviePosterMap,
  recommendedFeedItem,
} from "@/infra/database/drizzle/schema";

export async function getActiveRecommendationsFeed(userId: string) {
  const feed = await db.query.recommendedFeed.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.userId, userId), eq(table.status, "active")),
    orderBy: (table, { desc }) => [desc(table.generatedAt)],
  });

  if (!feed) {
    return null;
  }

  const items = await db
    .select({
      feedItemId: recommendedFeedItem.id,
      feedId: recommendedFeedItem.feedId,
      rank: recommendedFeedItem.rank,
      status: recommendedFeedItem.status,
      userRating: recommendedFeedItem.userRating,
      ratedAt: recommendedFeedItem.ratedAt,
      movieId: movie.id,
      sourceMovieId: movie.sourceMovieId,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
      posterPath: moviePosterMap.posterPath,
      backdropPath: moviePosterMap.backdropPath,
    })
    .from(recommendedFeedItem)
    .innerJoin(movie, eq(movie.id, recommendedFeedItem.movieId))
    .leftJoin(moviePosterMap, eq(moviePosterMap.movieId, movie.id))
    .where(eq(recommendedFeedItem.feedId, feed.id))
    .orderBy(recommendedFeedItem.rank);

  const movieIds = items.map((item) => item.movieId);

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

  return {
    feed,
    items: items.map((item) => ({
      feedItemId: item.feedItemId,
      feedId: item.feedId,
      rank: item.rank,
      status: item.status,
      userRating: item.userRating,
      ratedAt: item.ratedAt,
      id: item.movieId,
      sourceMovieId: item.sourceMovieId,
      title: item.title,
      releaseYear: item.releaseYear,
      popularityBucket: item.popularityBucket,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      genres: genresByMovieId.get(item.movieId) ?? [],
    })),
  };
}
