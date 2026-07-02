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

export type SearchMoviesResponse = {
  data: SearchMovieItem[];
  meta: {
    page: number;
    limit: number;
    count: number;
    hasMore: boolean;
  };
};

export type SearchFiltersState = {
  title: string;
  year: string;
  genreText: string;
};