export type SearchMovieItem = {
  id: string;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  posterUrl?: string | null;
};

export type SearchMoviesResponse = {
  data: SearchMovieItem[];
  meta: {
    page: number;
    limit: number;
    count: number;
  };
};

export type SearchFiltersState = {
  title: string;
  year: string;
  genreText: string;
};