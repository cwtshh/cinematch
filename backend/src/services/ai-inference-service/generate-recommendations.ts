import { and, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";
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

type MovieWithGenres = {
  id: string;
  sourceMovieId: number;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  genres: Array<{ slug: string; label: string }>;
};

function matchesPopularity(
  popularityBucket: string | null,
  userPref: string | null,
): boolean {
  if (!userPref) return true;
  if (!popularityBucket) return true; // sem dado → não filtrar
  if (userPref === "popular") return popularityBucket === "popular";
  if (userPref === "hidden-gems") return popularityBucket === "hidden-gem";
  return true;
}

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
    .select({ slug: genre.slug })
    .from(userPreferenceGenre)
    .innerJoin(genre, eq(genre.id, userPreferenceGenre.genreId))
    .where(eq(userPreferenceGenre.userId, userId));

  const preferredSlugs = new Set(genreRows.map((r) => r.slug));

  const eraFilter = prefRow?.era && prefRow.era !== "any" ? prefRow.era : null;
  const popularityFilter =
    prefRow?.popularity && prefRow.popularity !== "any" ? prefRow.popularity : null;

  const payload = {
    user_id: userId,
    ratings: ratingsRows.map((row) => ({
      source_movie_id: row.sourceMovieId,
      rating: Number(row.rating),
    })),
    preference_genres: [...preferredSlugs],
    era: mapEraToInference(prefRow?.era),
    popularity: mapPopularityToInference(prefRow?.popularity),
    already_watched_source_movie_ids: ratingsRows.map((row) => row.sourceMovieId),
    n_recommendations: nRecommendations,
  };

  let sourceMovieIds: number[] = [];

  try {
    const result = await requestRecommendations(payload);
    sourceMovieIds = result.source_movie_ids;
  } catch (error) {
    throw mapInferenceAxiosError(error);
  }

  // ── Busca os filmes retornados pelo AI ─────────────────────────────────────

  const aiMovies =
    sourceMovieIds.length > 0
      ? await db
          .select({
            id: movie.id,
            sourceMovieId: movie.sourceMovieId,
            title: movie.title,
            releaseYear: movie.releaseYear,
            popularityBucket: movie.popularityBucket,
          })
          .from(movie)
          .where(inArray(movie.sourceMovieId, sourceMovieIds))
      : [];

  const aiMovieIds = aiMovies.map((m) => m.id);

  const aiGenreRelations =
    aiMovieIds.length > 0
      ? await db
          .select({
            movieId: movieGenre.movieId,
            slug: genre.slug,
            label: genre.label,
          })
          .from(movieGenre)
          .innerJoin(genre, eq(genre.id, movieGenre.genreId))
          .where(inArray(movieGenre.movieId, aiMovieIds))
      : [];

  const aiGenresByMovieId = new Map<string, Array<{ slug: string; label: string }>>();
  for (const rel of aiGenreRelations) {
    const curr = aiGenresByMovieId.get(rel.movieId) ?? [];
    curr.push({ slug: rel.slug, label: rel.label });
    aiGenresByMovieId.set(rel.movieId, curr);
  }

  const aiMoviesBySourceId = new Map(aiMovies.map((m) => [m.sourceMovieId, m]));

  const aiResults: MovieWithGenres[] = sourceMovieIds
    .map((sid) => aiMoviesBySourceId.get(sid))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ ...m, genres: aiGenresByMovieId.get(m.id) ?? [] }));

  // ── Funções de filtro de era ──────────────────────────────────────────────

  function matchesEra(releaseYear: number | null, era: string | null): boolean {
    if (!era || !releaseYear) return true;
    if (era === "before-1980") return releaseYear < 1980;
    if (era === "80s-90s") return releaseYear >= 1980 && releaseYear <= 1999;
    if (era === "2000-plus") return releaseYear >= 2000;
    return true;
  }

  // ── Filtra pelo gênero e época preferidos ─────────────────────────────────

  const genreFiltered: MovieWithGenres[] =
    preferredSlugs.size > 0
      ? aiResults.filter((m) => m.genres.some((g) => preferredSlugs.has(g.slug)))
      : aiResults;

  const eraAndGenreFiltered: MovieWithGenres[] = eraFilter
    ? genreFiltered.filter((m) => matchesEra(m.releaseYear, eraFilter))
    : genreFiltered;

  const filtered: MovieWithGenres[] = popularityFilter
    ? eraAndGenreFiltered.filter((m) =>
        matchesPopularity(m.popularityBucket, popularityFilter),
      )
    : eraAndGenreFiltered;

  if (filtered.length >= nRecommendations) {
    return filtered.slice(0, nRecommendations);
  }

  // ── Fallback: complementa com filmes do banco no gênero/época/popularidade ─

  if (preferredSlugs.size === 0 && !eraFilter && !popularityFilter) return filtered;

  const needed = nRecommendations - filtered.length;
  const excludeMovieIds = new Set([
    ...aiResults.map((m) => m.id),
    ...filtered.map((m) => m.id),
  ]);
  const excludeSourceIds = new Set(ratingsRows.map((r) => r.sourceMovieId));

  const supplementConditions: SQL[] = [];
  if (preferredSlugs.size > 0) {
    supplementConditions.push(inArray(genre.slug, [...preferredSlugs]));
  }
  if (eraFilter === "before-1980") {
    supplementConditions.push(sql`${movie.releaseYear} < 1980`);
  } else if (eraFilter === "80s-90s") {
    supplementConditions.push(sql`${movie.releaseYear} >= 1980`);
    supplementConditions.push(sql`${movie.releaseYear} <= 1999`);
  } else if (eraFilter === "2000-plus") {
    supplementConditions.push(sql`${movie.releaseYear} >= 2000`);
  }
  if (popularityFilter === "popular") {
    supplementConditions.push(eq(movie.popularityBucket, "popular"));
  } else if (popularityFilter === "hidden-gems") {
    supplementConditions.push(eq(movie.popularityBucket, "hidden-gem"));
  }
  if (excludeMovieIds.size > 0) {
    supplementConditions.push(notInArray(movie.id, [...excludeMovieIds]));
  }
  if (excludeSourceIds.size > 0) {
    supplementConditions.push(notInArray(movie.sourceMovieId, [...excludeSourceIds]));
  }

  const supplementRaw = await db
    .select({
      id: movie.id,
      sourceMovieId: movie.sourceMovieId,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
    })
    .from(movie)
    .innerJoin(movieGenre, eq(movie.id, movieGenre.movieId))
    .innerJoin(genre, eq(genre.id, movieGenre.genreId))
    .where(and(...supplementConditions))
    .groupBy(movie.id, movie.sourceMovieId, movie.title, movie.releaseYear, movie.popularityBucket)
    .orderBy(sql`random()`)
    .limit(needed);

  const supplementIds = supplementRaw.map((m) => m.id);

  const supplementGenreRelations =
    supplementIds.length > 0
      ? await db
          .select({
            movieId: movieGenre.movieId,
            slug: genre.slug,
            label: genre.label,
          })
          .from(movieGenre)
          .innerJoin(genre, eq(genre.id, movieGenre.genreId))
          .where(inArray(movieGenre.movieId, supplementIds))
      : [];

  const supplementGenresByMovieId = new Map<string, Array<{ slug: string; label: string }>>();
  for (const rel of supplementGenreRelations) {
    const curr = supplementGenresByMovieId.get(rel.movieId) ?? [];
    curr.push({ slug: rel.slug, label: rel.label });
    supplementGenresByMovieId.set(rel.movieId, curr);
  }

  const supplement: MovieWithGenres[] = supplementRaw.map((m) => ({
    ...m,
    genres: supplementGenresByMovieId.get(m.id) ?? [],
  }));

  return [...filtered, ...supplement];
}
