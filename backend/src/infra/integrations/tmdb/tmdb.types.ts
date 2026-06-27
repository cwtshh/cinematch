export type TmdbSearchMovieResult = {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};

export type TmdbSearchMovieResponse = {
  page: number;
  results: TmdbSearchMovieResult[];
  total_pages: number;
  total_results: number;
};

export type TmdbMovieGenre = {
  id: number;
  name: string;
};

export type TmdbMovieProductionCompany = {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
};

export type TmdbMovieProductionCountry = {
  iso_3166_1: string;
  name: string;
};

export type TmdbMovieSpokenLanguage = {
  english_name: string;
  iso_639_1: string;
  name: string;
};

export type TmdbMovieDetailsResponse = {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: unknown | null;
  budget: number;
  genres: TmdbMovieGenre[];
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: TmdbMovieProductionCompany[];
  production_countries: TmdbMovieProductionCountry[];
  release_date: string | null;
  revenue: number;
  runtime: number | null;
  spoken_languages: TmdbMovieSpokenLanguage[];
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};
