export type TmdbSearchMovieResult = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number;
  genre_ids: number[];
};

export type TmdbSearchMovieResponse = {
  page: number;
  results: TmdbSearchMovieResult[];
  total_pages: number;
  total_results: number;
};
