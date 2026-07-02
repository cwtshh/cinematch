import { tmdbClient } from "@/infra/http/tmdb-client";
import { buildTmdbPosterUrl } from "./tmdb-image";
import type {
  TmdbSearchMovieResponse,
  TmdbSearchMovieResult,
} from "./tmdb.types";

type SearchMoviesByTitleInput = {
  title: string;
  year?: number;
  language?: string;
  page?: number;
};

export type SearchMovieByTitleItem = {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
};

function mapTmdbMovie(movie: TmdbSearchMovieResult): SearchMovieByTitleItem {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    posterUrl: buildTmdbPosterUrl(movie.poster_path, "w500"),
    backdropPath: movie.backdrop_path,
    backdropUrl: buildTmdbPosterUrl(movie.backdrop_path, "original"),
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
  };
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripYear(title: string) {
  return normalizeWhitespace(title.replace(/\(\d{4}\)\s*$/g, ""));
}

function stripExtraParentheses(title: string) {
  return normalizeWhitespace(title.replace(/\([^)]*\)/g, ""));
}

function moveTrailingArticle(title: string) {
  return title
    .replace(/,\s*The$/i, " The")
    .replace(/,\s*An$/i, " An")
    .replace(/,\s*A$/i, " A")
    .trim();
}

function normalizeSymbols(title: string) {
  return normalizeWhitespace(
    title.replace(/&/g, " and ").replace(/:/g, " ").replace(/-/g, " "),
  );
}

function normalizeMovieTitle(title: string) {
  return normalizeWhitespace(
    normalizeSymbols(moveTrailingArticle(stripYear(title))),
  );
}

function buildCandidateTitles(title: string): string[] {
  const original = normalizeWhitespace(title);
  const noYear = stripYear(original);
  const movedArticle = moveTrailingArticle(noYear);
  const noExtraParens = stripExtraParentheses(movedArticle);
  const normalized = normalizeSymbols(noExtraParens);
  const compact = normalizeWhitespace(normalized);

  return Array.from(
    new Set(
      [
        original,
        noYear,
        movedArticle,
        noExtraParens,
        normalized,
        compact,
        normalizeMovieTitle(title),
      ]
        .map((item) => normalizeWhitespace(item))
        .filter(Boolean),
    ),
  );
}

function extractReleaseYear(releaseDate: string | null | undefined) {
  if (!releaseDate) return null;
  const match = releaseDate.match(/^(\d{4})-/);
  return match ? Number(match[1]) : null;
}

function normalizeForComparison(value: string) {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s]/g, " "),
  );
}

function scoreMovieMatch(
  movie: TmdbSearchMovieResult,
  expectedTitle: string,
  expectedYear?: number,
) {
  let score = 0;

  const normalizedExpected = normalizeForComparison(expectedTitle);
  const normalizedTitle = normalizeForComparison(movie.title);
  const normalizedOriginalTitle = normalizeForComparison(movie.original_title);

  if (normalizedTitle === normalizedExpected) score += 120;
  if (normalizedOriginalTitle === normalizedExpected) score += 100;

  if (normalizedTitle.includes(normalizedExpected)) score += 40;
  if (normalizedOriginalTitle.includes(normalizedExpected)) score += 30;

  const releaseYear = extractReleaseYear(movie.release_date);

  if (expectedYear && releaseYear) {
    if (releaseYear === expectedYear) score += 80;
    else if (Math.abs(releaseYear - expectedYear) === 1) score += 20;
    else score -= 30;
  }

  if (movie.poster_path) score += 15;
  if (movie.backdrop_path) score += 10;

  score += Math.min(movie.vote_average ?? 0, 10);

  return score;
}

async function searchSingleQuery({
  query,
  year,
  language,
  page,
}: {
  query: string;
  year?: number;
  language: string;
  page: number;
}) {
  const { data } = await tmdbClient.get<TmdbSearchMovieResponse>(
    "/search/movie",
    {
      params: {
        query,
        language,
        page,
        ...(year ? { year } : {}),
      },
    },
  );

  return data.results ?? [];
}

export async function searchMoviesByTitle({
  title,
  year,
  language = "pt-BR",
  page = 1,
}: SearchMoviesByTitleInput): Promise<SearchMovieByTitleItem[]> {
  const normalizedTitle = normalizeWhitespace(title);

  if (!normalizedTitle) {
    return [];
  }

  const candidateTitles = buildCandidateTitles(normalizedTitle);

  const settledResults = await Promise.all(
    candidateTitles.map(async (query) => {
      try {
        const results = await searchSingleQuery({
          query,
          year,
          language,
          page,
        });

        return results;
      } catch {
        return [];
      }
    }),
  );

  const mergedResults = settledResults.flat();

  const uniqueResults = Array.from(
    new Map(mergedResults.map((movie) => [movie.id, movie])).values(),
  );

  const rankedResults = uniqueResults
    .map((movie) => ({
      movie,
      score: scoreMovieMatch(movie, normalizeMovieTitle(normalizedTitle), year),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ movie }) => movie);

  return rankedResults.map(mapTmdbMovie);
}

export async function searchFirstMovieByTitle({
  title,
  year,
  language = "pt-BR",
}: Omit<
  SearchMoviesByTitleInput,
  "page"
>): Promise<SearchMovieByTitleItem | null> {
  const results = await searchMoviesByTitle({
    title,
    year,
    language,
    page: 1,
  });

  return results[0] ?? null;
}

export async function searchFirstMovieByTitleWithFallback({
  title,
  year,
}: Omit<SearchMoviesByTitleInput, "page" | "language">): Promise<SearchMovieByTitleItem | null> {
  const ptResult = await searchFirstMovieByTitle({ title, year, language: "pt-BR" });

  if (ptResult?.overview) return ptResult;

  // sinopse pt-BR vazia ou filme não encontrado → tenta en-US
  try {
    const enResult = await searchFirstMovieByTitle({ title, year, language: "en-US" });
    if (!enResult) return ptResult ?? null;
    // usa título/poster pt-BR (quando existia) mas overview en-US
    return ptResult
      ? { ...ptResult, overview: enResult.overview }
      : enResult;
  } catch {
    return ptResult ?? null;
  }
}
