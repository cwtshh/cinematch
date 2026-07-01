import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowRight, Clapperboard, Star } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type MovieToRate = {
  id: string;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  posterUrl: string | null;
};

type GetMoviesResponse = {
  items: MovieToRate[];
};

type SubmitRatingsPayload = {
  ratings: {
    movieId: string;
    rating: number;
  }[];
};

type SubmitRatingsResponse = {
  savedCount: number;
  hasCompletedInitialMovieRating: boolean;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const MIN_RATINGS_REQUIRED = 5;
const STAR_VALUES = [1, 2, 3, 4, 5];

export function InitialMovieRatingPage() {
  const navigate = useNavigate();
  const { refetch } = authClient.useSession();

  const [movies, setMovies] = useState<MovieToRate[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadMovies() {
      setIsLoadingMovies(true);
      setErrorMessage(null);

      try {
        const { data } = await apiClient.get<GetMoviesResponse>(
          "/initial-movie-rating/movies",
          {
            params: {
              limit: 12,
            },
          },
        );

        setMovies(data.items);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const responseData = error.response?.data as
            | ApiErrorResponse
            | undefined;

          setErrorMessage(
            responseData?.message ??
              responseData?.error ??
              "Não foi possível carregar os filmes para avaliação.",
          );
        } else {
          setErrorMessage("Ocorreu um erro inesperado.");
        }
      } finally {
        setIsLoadingMovies(false);
      }
    }

    loadMovies();
  }, []);

  function handleRateMovie(movieId: string, value: number) {
    setRatings((current) => ({
      ...current,
      [movieId]: current[movieId] === value ? 0 : value,
    }));
  }

  const ratedMoviesCount = useMemo(() => {
    return Object.values(ratings).filter((rating) => rating > 0).length;
  }, [ratings]);

  const ratedMoviesPayload = useMemo(() => {
    return Object.entries(ratings)
      .filter(([, rating]) => rating > 0)
      .map(([movieId, rating]) => ({
        movieId,
        rating,
      }));
  }, [ratings]);

  const isSubmitDisabled =
    ratedMoviesCount < MIN_RATINGS_REQUIRED || isSubmitting || isLoadingMovies;

  async function handleSubmit() {
    if (isSubmitDisabled) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const payload: SubmitRatingsPayload = {
      ratings: ratedMoviesPayload,
    };

    try {
      await apiClient.post<SubmitRatingsResponse>(
        "/initial-movie-rating",
        payload,
      );
      await refetch();
      navigate("/for-you", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | ApiErrorResponse
          | undefined;

        setErrorMessage(
          responseData?.message ??
            responseData?.error ??
            "Não foi possível salvar suas avaliações.",
        );
      } else {
        setErrorMessage("Ocorreu um erro inesperado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-2 rounded-full px-3 py-1"
              >
                <Clapperboard className="h-3.5 w-3.5" />
                Etapa 2 de 2
              </Badge>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Avalie alguns filmes para calibrar seu perfil
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm md:text-base">
                Dê nota para filmes que você conhece. Isso ajuda a montar uma
                base inicial melhor antes da recomendação final.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">
                {ratedMoviesCount} de {MIN_RATINGS_REQUIRED} avaliações mínimas
              </Badge>

              <Badge variant="outline" className="rounded-full">
                {movies.length} filmes carregados
              </Badge>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}
          </CardHeader>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Filmes para avaliar</CardTitle>
            <CardDescription>
              Escolha pelo menos {MIN_RATINGS_REQUIRED} filmes e dê uma nota de
              1 a 5.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoadingMovies ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="mt-6 flex gap-2">
                      {STAR_VALUES.map((value) => (
                        <div
                          key={value}
                          className="h-9 w-9 animate-pulse rounded-full bg-muted"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : movies.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum filme foi encontrado para essa etapa agora.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {movies.map((movie) => {
                  const currentRating = ratings[movie.id] ?? 0;

                  return (
                    <Card
                      key={movie.id}
                      className="border-border bg-background shadow-none"
                    >
                      {movie.posterUrl && (
                        <div className="relative h-48 w-full overflow-hidden rounded-t-xl">
                          <img
                            src={movie.posterUrl}
                            alt={`Poster de ${movie.title}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="space-y-3">
                        <div className="space-y-2">
                          <CardTitle className="text-base leading-snug">
                            {movie.title}
                          </CardTitle>

                          <div className="flex flex-wrap gap-2">
                            {movie.releaseYear && (
                              <Badge variant="outline" className="rounded-full">
                                {movie.releaseYear}
                              </Badge>
                            )}

                            {movie.popularityBucket && (
                              <Badge variant="outline" className="rounded-full">
                                {movie.popularityBucket}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Sua nota atual:{" "}
                          <span className="font-medium text-foreground">
                            {currentRating > 0
                              ? `${currentRating}/5`
                              : "não avaliado"}
                          </span>
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {STAR_VALUES.map((value) => {
                            const isSelected = currentRating >= value;

                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleRateMovie(movie.id, value)}
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
                                  isSelected
                                    ? "border-yellow-500 bg-yellow-500/15 text-yellow-400"
                                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                                aria-label={`Dar nota ${value} para ${movie.title}`}
                              >
                                <Star
                                  className={cn(
                                    "h-4.5 w-4.5",
                                    isSelected &&
                                      "fill-yellow-400 text-yellow-400",
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-background/95 px-4 pb-4 pt-4 backdrop-blur md:-mx-6 md:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Progresso da avaliação
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ratedMoviesCount} de {MIN_RATINGS_REQUIRED} filmes avaliados.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="min-w-55"
            >
              {isSubmitting ? "Salvando avaliações..." : "Concluir avaliações"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4.5 w-4.5" />}
            </Button>
          </div>
        </div>

        <Separator className="opacity-0" />
      </div>
    </div>
  );
}
