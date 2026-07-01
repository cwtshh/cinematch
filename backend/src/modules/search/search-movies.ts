import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/infra/database/client";
import { genre, movie, movieGenre } from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitle } from "@/infra/integrations/tmdb/tmdb.service";

const GENRE_TRANSLATION_MAP: Record<string, string> = {
  acao: "action",
  animacao: "animation",
  aventura: "adventure",
  comedia: "comedy",
  crime: "crime",
  documentario: "documentary",
  drama: "drama",
  familia: "family",
  fantasia: "fantasy",
  historia: "history",
  terror: "horror",
  musica: "music",
  misterio: "mystery",
  romance: "romance",
  "ficcao cientifica": "science fiction",
  suspense: "thriller",
  guerra: "war",
  faroeste: "western",
};

type SearchParams = {
  title?: string;
  year?: number;
  genreText?: string;
  page: number;
  limit: number;
};

export async function searchMoviesAction({
  title,
  year,
  genreText,
  page,
  limit,
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
    return [];
  }

  const results = await db
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
    .limit(limit)
    .offset(offset);

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
        };
      }),
    );

    enrichedResults.push(...batchResults);
  }

  return enrichedResults;
}
