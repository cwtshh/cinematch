import { tmdbClient } from "@/infra/http/tmdb-client";
import { buildTmdbPosterUrl } from "./tmdb-image";
import type {
  TmdbSearchMovieResponse,
  TmdbSearchMovieResult,
} from "./tmdb.types";

type SearchMovieByTitleInput = {
  title: string;
  year?: number;
};

type SearchMovieByTitleOutput = {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
};

export async function searchMovieByTitle({
  title,
  year,
}: SearchMovieByTitleInput): Promise<SearchMovieByTitleOutput | null> {
  const { data } = await tmdbClient.get<TmdbSearchMovieResponse>(
    "/search/movie",
    {
      params: {
        query: title,
        ...(year ? { year } : {}),
      },
    },
  );

  const movie: TmdbSearchMovieResult | undefined = data.results?.[0];

  if (!movie) {
    return null;
  }

  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    posterUrl: buildTmdbPosterUrl(movie.poster_path, "w500"),
    backdropPath: movie.backdrop_path,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
  };
}
