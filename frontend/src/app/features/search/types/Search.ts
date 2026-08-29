export type SearchMovieItem = {
  id: string;
  title: string;
  tmdbTitle?: string | null;
  overview?: string | null;
  releaseYear: number | null;
  popularityBucket: string | null;
  posterUrl?: string | null;
  genres?: { slug: string; label: string }[];
  userRating?: number | null;
  inWatchlist?: boolean;
};

/** Estratégia de busca por título usada pelo backend. */
export type SearchMode = "sql" | "index" | "both";

/**
 * Medições da fase de busca por título.
 *
 * Os tempos NÃO incluem o enriquecimento via TMDB, que faz chamada de
 * rede por filme sem cache e mascararia a diferença entre os algoritmos.
 */
export type SearchTimings = {
  mode: SearchMode;
  sqlMs: number | null;
  indexMs: number | null;
  sqlCount: number | null;
  indexCount: number | null;
  identical: boolean | null;
  onlyIndex: number | null;
  onlySql: number | null;
  usedPrefixIndex: boolean;
};

export type SearchMoviesResponse = {
  data: SearchMovieItem[];
  meta: {
    page: number;
    limit: number;
    count: number;
    hasMore: boolean;
    timings?: SearchTimings;
  };
};

export type SearchFiltersState = {
  title: string;
  year: string;
  genreText: string;
};

export type AutocompleteItem = {
  id: string;
  title: string;
};

export type AutocompleteResponse = {
  data: AutocompleteItem[];
  meta: {
    query: string;
    count: number;
    totalMatches: number;
    comparisons: number;
    durationMs: number;
  };
};
