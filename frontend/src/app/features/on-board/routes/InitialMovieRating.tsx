import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowRight, Clapperboard, Star } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type MovieToRate = {
  id: string;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  posterUrl: string | null;
  overview: string | null;
  genres: { slug: string; label: string }[];
};

type GetMoviesResponse = {
  items: MovieToRate[];
};

type SubmitRatingsPayload = {
  ratings: { movieId: string; rating: number }[];
};

type SubmitRatingsResponse = {
  savedCount: number;
  hasCompletedInitialMovieRating: boolean;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const STAR_VALUES = [1, 2, 3, 4, 5];

function FlipCard({
  movie,
  currentRating,
  onRate,
}: {
  movie: MovieToRate;
  currentRating: number;
  onRate: (movieId: string, value: number) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isRated = currentRating > 0;

  return (
    <>
      <div className="group relative [perspective:1000px]">
        <div className="relative aspect-[2/3] w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

          {/* ── FRENTE ─────────────────────────────────────────────────── */}
          <div
            className={cn(
              "absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]",
              isRated ? "ring-2 ring-yellow-400" : "ring-1 ring-border",
            )}
          >
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                <Clapperboard className="h-10 w-10 text-zinc-600" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                {movie.title}
              </p>
              {movie.releaseYear && (
                <p className="mt-0.5 text-xs text-zinc-400">{movie.releaseYear}</p>
              )}
              {isRated && (
                <div className="mt-1.5 flex items-center gap-0.5">
                  {STAR_VALUES.map((v) => (
                    <Star
                      key={v}
                      className={cn(
                        "h-3 w-3",
                        v <= currentRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-zinc-600",
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── VERSO ──────────────────────────────────────────────────── */}
          <div className="absolute inset-0 flex flex-col gap-3 overflow-hidden rounded-2xl bg-zinc-900 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ring-1 ring-zinc-700">
            <div className="min-h-0 flex-1 overflow-hidden">
              <p className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-white">
                {movie.title}
              </p>
              {movie.genres.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {movie.genres.slice(0, 3).map((g) => (
                    <span
                      key={g.slug}
                      className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                    >
                      {g.label}
                    </span>
                  ))}
                </div>
              )}
              {movie.overview ? (
                <div>
                  <p className="line-clamp-4 text-xs leading-relaxed text-zinc-400">
                    {movie.overview}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="mt-1 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                  >
                    Ver mais
                  </button>
                </div>
              ) : (
                <p className="text-xs italic text-zinc-600">Sinopse não disponível.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                {currentRating > 0 ? `${currentRating} de 5 estrelas` : "Avaliar"}
              </p>
              <div className="flex gap-2">
                {STAR_VALUES.map((value) => {
                  const isSelected = currentRating >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onRate(movie.id, value)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-150",
                        isSelected
                          ? "border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.35)]"
                          : "border-zinc-600 bg-zinc-800/60 text-zinc-500 hover:border-yellow-500/60 hover:text-yellow-400/80",
                      )}
                      aria-label={`Dar nota ${value} para ${movie.title}`}
                    >
                      <Star className={cn("h-5 w-5", isSelected && "fill-yellow-300 text-yellow-300")} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL DE SINOPSE COMPLETA ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="leading-snug">{movie.title}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            {movie.posterUrl && (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="h-40 w-28 flex-shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {movie.releaseYear && (
                  <span className="text-sm text-muted-foreground">{movie.releaseYear}</span>
                )}
                {movie.genres.map((g) => (
                  <span
                    key={g.slug}
                    className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {g.label}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{movie.overview}</p>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {currentRating > 0 ? `${currentRating} de 5 estrelas` : "Avaliar"}
            </p>
            <div className="flex gap-2">
              {STAR_VALUES.map((value) => {
                const isSelected = currentRating >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onRate(movie.id, value)}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-150",
                      isSelected
                        ? "border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.35)]"
                        : "border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-yellow-400/60 hover:text-yellow-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-yellow-500/60 dark:hover:text-yellow-400",
                    )}
                    aria-label={`Dar nota ${value} para ${movie.title}`}
                  >
                    <Star className={cn("h-5 w-5", isSelected && "fill-yellow-300 text-yellow-300")} />
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
          { params: { limit: 20 } },
        );
        setMovies(data.items);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const responseData = error.response?.data as ApiErrorResponse | undefined;
          setErrorMessage(
            responseData?.message ?? responseData?.error ?? "Não foi possível carregar os filmes.",
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

  const ratedMoviesCount = useMemo(
    () => Object.values(ratings).filter((r) => r > 0).length,
    [ratings],
  );

  const ratedMoviesPayload = useMemo(
    () =>
      Object.entries(ratings)
        .filter(([, rating]) => rating > 0)
        .map(([movieId, rating]) => ({ movieId, rating })),
    [ratings],
  );

  async function handleSubmit(skipRatings = false) {
    if (isSubmitting || isLoadingMovies) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    const payload: SubmitRatingsPayload = {
      ratings: skipRatings ? [] : ratedMoviesPayload,
    };

    try {
      await apiClient.post<SubmitRatingsResponse>("/initial-movie-rating", payload);
      await refetch();
      navigate("/for-you", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as ApiErrorResponse | undefined;
        setErrorMessage(
          responseData?.message ?? responseData?.error ?? "Não foi possível salvar suas avaliações.",
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
              <Badge variant="secondary" className="gap-2 rounded-full px-3 py-1">
                <Clapperboard className="h-3.5 w-3.5" />
                Etapa 2 de 2
              </Badge>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Avalie os filmes que você conhece
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm md:text-base">
                Dê nota para os filmes que já assistiu. Os que não conhecer, ignore — só avalie o que você realmente viu.
                Quanto mais você avaliar, mais personalizadas ficam suas recomendações.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {ratedMoviesCount > 0 && (
                <Badge variant="outline" className="rounded-full">
                  {ratedMoviesCount} {ratedMoviesCount === 1 ? "filme avaliado" : "filmes avaliados"}
                </Badge>
              )}
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

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Passe o mouse sobre um card para ver a sinopse e dar nota.
          </p>

          {isLoadingMovies ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
                />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum filme foi encontrado para essa etapa agora.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {movies.map((movie) => (
                <FlipCard
                  key={movie.id}
                  movie={movie}
                  currentRating={ratings[movie.id] ?? 0}
                  onRate={handleRateMovie}
                />
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-background/95 px-4 pb-4 pt-4 backdrop-blur md:-mx-6 md:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Progresso
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ratedMoviesCount > 0
                  ? `${ratedMoviesCount} ${ratedMoviesCount === 1 ? "filme avaliado" : "filmes avaliados"} — quanto mais, melhor.`
                  : "Avalie o que conhece ou pule para receber recomendações genéricas."}
              </p>
            </div>

            <div className="flex gap-2">
              {ratedMoviesCount === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || isLoadingMovies}
                >
                  {isSubmitting ? "Carregando..." : "Pular por agora"}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || isLoadingMovies}
                className="min-w-48"
              >
                {isSubmitting
                  ? "Salvando..."
                  : ratedMoviesCount > 0
                    ? "Concluir avaliações"
                    : "Continuar sem avaliar"}
                {!isSubmitting && <ArrowRight className="ml-2 h-4.5 w-4.5" />}
              </Button>
            </div>
          </div>
        </div>

        <Separator className="opacity-0" />
      </div>
    </div>
  );
}
