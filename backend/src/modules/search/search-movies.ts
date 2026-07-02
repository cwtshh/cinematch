import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/infra/database/client";
import { genre, movie, movieGenre, userMovieRating } from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitle } from "@/infra/integrations/tmdb/tmdb.service";

const GENRE_TRANSLATION_MAP: Record<string, string> = {
  acao: "action",
  animacao: "animation",
  aventura: "adventure",
  comedia: "comedy",
  crime: "crime",
  documentario: "documentary",
  drama: "drama",
  familia: "children",
  criancas: "children",
  infantil: "children",
  fantasia: "fantasy",
  historia: "history",
  terror: "horror",
  musica: "musical",
  musical: "musical",
  misterio: "mystery",
  romance: "romance",
  "ficcao cientifica": "sci_fi",
  ficcao: "sci_fi",
  suspense: "thriller",
  guerra: "war",
  faroeste: "western",
  noir: "film_noir",
  "filme noir": "film_noir",
};

type SearchParams = {
  title?: string;
  year?: number;
  genreText?: string;
  page: number;
  limit: number;
  userId?: string;
};

export async function searchMoviesAction({
  title,
  year,
  genreText,
  page,
  limit,
  userId,
}: SearchParams) {
  const offset = (page - 1) * limit;
  const conditions = [];

  if (title && title.trim() !== "") {
    conditions.push(ilike(movie.title, `%${title}%`));
  }

  if (year) {
    conditions.push(eq(movie.releaseYear, year));
  }

  if (genreText && genreText.trim() !== "") {
    const normalizedInput = genreText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const englishTerm =
      GENRE_TRANSLATION_MAP[normalizedInput] || normalizedInput;

    conditions.push(
      or(
        ilike(genre.slug, `%${englishTerm}%`),
        ilike(genre.label, `%${englishTerm}%`),
        ilike(genre.label, `%${genreText}%`),
      ),
    );
  }

  if (conditions.length === 0) {
    return { movies: [], hasMore: false };
  }

  const rawResults = await db
    .select({
      id: movie.id,
      sourceMovieId: movie.sourceMovieId,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
    })
    .from(movie)
    .leftJoin(movieGenre, eq(movie.id, movieGenre.movieId))
    .leftJoin(genre, eq(movieGenre.genreId, genre.id))
    .where(and(...conditions))
    .groupBy(movie.id)
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rawResults.length > limit;
  const results = hasMore ? rawResults.slice(0, limit) : rawResults;

  // busca avaliações do usuário para esses filmes (se autenticado)
  const movieIds = results.map((r) => r.id);
  const ratingByMovieId = new Map<string, number>();
  if (userId && movieIds.length > 0) {
    const ratings = await db
      .select({ movieId: userMovieRating.movieId, rating: userMovieRating.rating })
      .from(userMovieRating)
      .where(and(eq(userMovieRating.userId, userId), inArray(userMovieRating.movieId, movieIds)));
    for (const r of ratings) {
      ratingByMovieId.set(r.movieId, Number(r.rating));
    }
  }

  const TMDB_BATCH_SIZE = 3;
  const enrichedResults = [];

  for (let i = 0; i < results.length; i += TMDB_BATCH_SIZE) {
    const batch = results.slice(i, i + TMDB_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        let tmdbMovie = null;

        try {
          tmdbMovie = await searchFirstMovieByTitle({
            title: item.title,
            year: item.releaseYear ?? undefined,
          });
        } catch {
          tmdbMovie = null;
        }

        return {
          ...item,
          posterPath: tmdbMovie?.posterPath ?? null,
          posterUrl: tmdbMovie?.posterUrl ?? null,
          backdropPath: tmdbMovie?.backdropPath ?? null,
          backdropUrl: tmdbMovie?.backdropUrl ?? null,
          userRating: ratingByMovieId.get(item.id) ?? null,
        };
      }),
    );

    enrichedResults.push(...batchResults);
  }

  return { movies: enrichedResults, hasMore };
}
