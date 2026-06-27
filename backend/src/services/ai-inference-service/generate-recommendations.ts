import { eq, inArray } from "drizzle-orm";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  userMovieRating,
  userPreference,
  userPreferenceGenre,
} from "@/infra/database/drizzle/schema";
import { requestRecommendations } from "./inference.client";
import { mapInferenceAxiosError } from "./inference.error";
import {
  mapEraToInference,
  mapPopularityToInference,
} from "./inference.mapper";

type GenerateRecommendationsForUserInput = {
  userId: string;
  nRecommendations?: number;
};

export async function generateRecommendationsForUser({
  userId,
  nRecommendations = 10,
}: GenerateRecommendationsForUserInput) {
  const ratingsRows = await db
    .select({
      sourceMovieId: movie.sourceMovieId,
      rating: userMovieRating.rating,
    })
    .from(userMovieRating)
    .innerJoin(movie, eq(movie.id, userMovieRating.movieId))
    .where(eq(userMovieRating.userId, userId));

  const [prefRow] = await db
    .select({
      era: userPreference.era,
      popularity: userPreference.popularity,
    })
    .from(userPreference)
    .where(eq(userPreference.userId, userId))
    .limit(1);

  const genreRows = await db
    .select({
      slug: genre.slug,
    })
    .from(userPreferenceGenre)
    .innerJoin(genre, eq(genre.id, userPreferenceGenre.genreId))
    .where(eq(userPreferenceGenre.userId, userId));

  const payload = {
    user_id: userId,
    ratings: ratingsRows.map((row) => ({
      source_movie_id: row.sourceMovieId,
      rating: Number(row.rating),
    })),
    preference_genres: genreRows.map((row) => row.slug),
    era: mapEraToInference(prefRow?.era),
    popularity: mapPopularityToInference(prefRow?.popularity),
    already_watched_source_movie_ids: ratingsRows.map(
      (row) => row.sourceMovieId,
    ),
    n_recommendations: nRecommendations,
  };

  let sourceMovieIds: number[];

  try {
    const result = await requestRecommendations(payload);
    sourceMovieIds = result.source_movie_ids;
  } catch (error) {
    throw mapInferenceAxiosError(error);
  }

  if (sourceMovieIds.length === 0) {
    return [];
  }

  const movies = await db
    .select({
      id: movie.id,
      sourceMovieId: movie.sourceMovieId,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
    })
    .from(movie)
    .where(inArray(movie.sourceMovieId, sourceMovieIds));

  const movieIds = movies.map((item) => item.id);

  const genreRelations = movieIds.length
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

  const moviesBySourceMovieId = new Map(
    movies.map((item) => [item.sourceMovieId, item]),
  );

  return sourceMovieIds
    .map((sourceMovieId) => moviesBySourceMovieId.get(sourceMovieId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      ...item,
      genres: genresByMovieId.get(item.id) ?? [],
    }));
}
