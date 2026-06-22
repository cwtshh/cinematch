import { eq, notExists, sql } from "drizzle-orm";

import { db } from "@/infra/database/client";
import { movie, moviePosterMap } from "@/infra/database/drizzle/schema";

const TMDB_TOKEN = Bun.env.TMDB_API_READ_KEY;

if (!TMDB_TOKEN) {
  throw new Error(
    "TMDB_API_READ_TOKEN ou TMDB_API_TOKEN não definido no ambiente.",
  );
}

type MovieRow = {
  id: string;
  sourceMovieId: number;
  title: string;
  releaseYear: number | null;
};

type TmdbMovieResult = {
  id: number;
  title: string;
  original_title: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  vote_count: number;
};

type TmdbSearchResponse = {
  page: number;
  results: TmdbMovieResult[];
  total_pages: number;
  total_results: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getYearFromReleaseDate(releaseDate: string | null) {
  if (!releaseDate || releaseDate.length < 4) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

function stripTrailingYear(title: string) {
  return title.replace(/\s*\((\d{4})\)\s*$/g, "").trim();
}

function removeAkas(title: string) {
  return title
    .replace(/\(a\.k\.a\.[^)]+\)/gi, "")
    .replace(/\(aka[^)]+\)/gi, "")
    .trim();
}

function removeParentheticalChunks(title: string) {
  return title
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchCandidates(title: string) {
  const candidates = new Set<string>();

  const base = stripTrailingYear(title);
  const noAka = removeAkas(base);
  const plain = removeParentheticalChunks(noAka);
  const beforeFirstParen = base.split("(")[0]?.trim();

  if (base) candidates.add(base);
  if (noAka) candidates.add(noAka);
  if (plain) candidates.add(plain);
  if (beforeFirstParen) candidates.add(beforeFirstParen);

  return [...candidates].filter((value) => value.length > 0);
}

function scoreTmdbResult(
  sourceTitle: string,
  sourceYear: number | null,
  result: TmdbMovieResult,
) {
  const normalizedSource = normalizeTitle(sourceTitle);
  const normalizedTitle = normalizeTitle(result.title || "");
  const normalizedOriginal = normalizeTitle(result.original_title || "");
  const resultYear = getYearFromReleaseDate(result.release_date);

  let score = 0;

  if (normalizedTitle === normalizedSource) score += 100;
  if (normalizedOriginal === normalizedSource) score += 90;

  if (normalizedTitle.includes(normalizedSource)) score += 20;
  if (normalizedOriginal.includes(normalizedSource)) score += 15;
  if (
    normalizedSource.includes(normalizedTitle) &&
    normalizedTitle.length > 3
  ) {
    score += 10;
  }

  if (sourceYear && resultYear) {
    const diff = Math.abs(sourceYear - resultYear);

    if (diff === 0) score += 50;
    else if (diff === 1) score += 25;
    else if (diff === 2) score += 10;
    else score -= 20;
  }

  if (result.poster_path) score += 15;
  if (result.backdrop_path) score += 5;

  score += Math.min(result.popularity || 0, 30);
  score += Math.min(result.vote_count || 0, 20) / 10;

  return {
    score,
    matchedYear: resultYear,
  };
}

async function searchMovieOnTmdb(
  title: string,
  year: number | null,
  yearMode: "year" | "primary_release_year" = "primary_release_year",
) {
  const params = new URLSearchParams({
    query: title,
    include_adult: "false",
    language: "en-US",
  });

  if (year) {
    params.set(yearMode, String(year));
  }

  const response = await fetch(
    `https://api.themoviedb.org/3/search/movie?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        accept: "application/json",
      },
    },
  );

  if (response.status === 429) {
    throw new Error("TMDb rate limit atingido (429).");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TMDb error ${response.status}: ${text}`);
  }

  return (await response.json()) as TmdbSearchResponse;
}

async function searchMovieVariants(title: string, year: number | null) {
  const candidates = buildSearchCandidates(title);

  for (const candidate of candidates) {
    const byPrimaryYear = await searchMovieOnTmdb(
      candidate,
      year,
      "primary_release_year",
    );

    if (byPrimaryYear.results.length > 0) {
      return {
        queryUsed: candidate,
        yearMode: "primary_release_year" as const,
        results: byPrimaryYear.results,
      };
    }

    const byYear = await searchMovieOnTmdb(candidate, year, "year");

    if (byYear.results.length > 0) {
      return {
        queryUsed: candidate,
        yearMode: "year" as const,
        results: byYear.results,
      };
    }
  }

  return {
    queryUsed: null,
    yearMode: null,
    results: [] as TmdbMovieResult[],
  };
}

function parseArg(name: string, fallback: number) {
  const arg = Bun.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) return fallback;

  const value = Number(arg.split("=")[1]);
  return Number.isNaN(value) ? fallback : value;
}

async function getMoviesToProcess(limit: number, offset: number) {
  return db
    .select({
      id: movie.id,
      sourceMovieId: movie.sourceMovieId,
      title: movie.title,
      releaseYear: movie.releaseYear,
    })
    .from(movie)
    .where(
      notExists(
        db
          .select({ one: sql`1` })
          .from(moviePosterMap)
          .where(eq(moviePosterMap.movieId, movie.id)),
      ),
    )
    .limit(limit)
    .offset(offset);
}

async function upsertPosterMap(
  item: MovieRow,
  best: TmdbMovieResult,
  matchedYear: number | null,
) {
  await db
    .insert(moviePosterMap)
    .values({
      movieId: item.id,
      sourceMovieId: item.sourceMovieId,
      tmdbId: best.id,
      posterPath: best.poster_path,
      backdropPath: best.backdrop_path,
      matchedTitle: best.title,
      matchedYear,
    })
    .onConflictDoUpdate({
      target: moviePosterMap.movieId,
      set: {
        sourceMovieId: item.sourceMovieId,
        tmdbId: best.id,
        posterPath: best.poster_path,
        backdropPath: best.backdrop_path,
        matchedTitle: best.title,
        matchedYear,
        updatedAt: new Date(),
      },
    });
}

async function processMovie(item: MovieRow) {
  const response = await searchMovieVariants(item.title, item.releaseYear);

  if (!response.results.length) {
    return {
      status: "not_found" as const,
    };
  }

  const ranked = response.results
    .map((result) => {
      const scored = scoreTmdbResult(item.title, item.releaseYear, result);

      return {
        result,
        score: scored.score,
        matchedYear: scored.matchedYear,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  if (!best) {
    return {
      status: "not_found" as const,
    };
  }

  await upsertPosterMap(item, best.result, best.matchedYear);

  return {
    status: "matched" as const,
    tmdbId: best.result.id,
    matchedTitle: best.result.title,
    matchedYear: best.matchedYear,
    posterPath: best.result.poster_path,
    score: best.score,
    queryUsed: response.queryUsed,
    yearMode: response.yearMode,
  };
}

async function main() {
  const limit = parseArg("limit", 100);
  const offset = parseArg("offset", 0);
  const delayMs = parseArg("delay", 350);

  const movies = await getMoviesToProcess(limit, offset);

  console.log(
    `Processando ${movies.length} filmes | limit=${limit} offset=${offset} delay=${delayMs}ms`,
  );

  let matched = 0;
  let notFound = 0;
  let failed = 0;

  for (const item of movies) {
    try {
      const result = await processMovie(item);

      if (result.status === "not_found") {
        notFound++;
        console.log(
          `NOT_FOUND | ${item.sourceMovieId} | ${item.title} (${item.releaseYear ?? "s/ano"})`,
        );
      } else {
        matched++;
        console.log(
          `MATCHED | ${item.sourceMovieId} | ${item.title} -> ${result.matchedTitle} (${result.matchedYear ?? "s/ano"}) | tmdb=${result.tmdbId} | score=${result.score} | query="${result.queryUsed}" | mode=${result.yearMode}`,
        );
      }

      await sleep(delayMs);
    } catch (error) {
      failed++;
      console.error(
        `FAILED | ${item.sourceMovieId} | ${item.title} (${item.releaseYear ?? "s/ano"})`,
        error,
      );

      await sleep(1000);
    }
  }

  console.log("");
  console.log("Resumo:");
  console.log({
    processed: movies.length,
    matched,
    notFound,
    failed,
  });
}

await main();
