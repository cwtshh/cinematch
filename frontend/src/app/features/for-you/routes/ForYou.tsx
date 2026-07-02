import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RecommendedMovieCard } from "../components/recommended-movie-card";
import type {
  ActiveRecommendationsResponse,
  RecommendationItem,
} from "../types/recommendation";
import { apiClient } from "@/lib/axios";
import { getGenreLabel } from "@/lib/genre-labels";

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

function extrairMensagemDeErro(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.message ?? data?.error ?? fallback;
  }
  return "Ocorreu um erro inesperado.";
}

const MIN_RATED_TO_REFRESH = 5;

export function ForYou() {
  const [data, setData] = useState<ActiveRecommendationsResponse | null>(null);
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRecommendations(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const { data } = await apiClient.get<ActiveRecommendationsResponse>(
        "/recommendations/active",
      );
      setData(data);
      setItems(data.items);
    } catch (error) {
      setError(extrairMensagemDeErro(error, "Não foi possível carregar suas recomendações."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefreshRecommendations() {
    if (!canRefreshRecommendations || isRefreshing) return;
    try {
      setIsRefreshing(true);
      setError(null);
      await apiClient.post("/recommendations/refresh", { limit: 20 });
      const { data } = await apiClient.get<ActiveRecommendationsResponse>(
        "/recommendations/active",
      );
      setData(data);
      setItems(data.items);
    } catch (error) {
      setError(extrairMensagemDeErro(error, "Não foi possível gerar novas recomendações."));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRateMovie(feedItemId: string, rating: number) {
    try {
      setIsSubmittingRating(true);
      setError(null);
      await apiClient.post(`/recommendations/${feedItemId}/rate`, { rating });
      const ratedAt = new Date().toISOString();
      setItems((curr) =>
        curr.map((movie) =>
          movie.feedItemId === feedItemId
            ? { ...movie, userRating: rating, status: "rated", ratedAt }
            : movie,
        ),
      );
      setData((curr) => {
        if (!curr) return curr;
        return {
          ...curr,
          items: curr.items.map((movie) =>
            movie.feedItemId === feedItemId
              ? { ...movie, userRating: rating, status: "rated", ratedAt }
              : movie,
          ),
        };
      });
    } catch (error) {
      setError(extrairMensagemDeErro(error, "Não foi possível salvar sua avaliação."));
    } finally {
      setIsSubmittingRating(false);
    }
  }

  async function handleUnrateMovie(movieId: string) {
    try {
      await apiClient.delete(`/movies/${movieId}/rate`);
      const reset = (m: RecommendationItem) =>
        m.id === movieId ? { ...m, userRating: null, status: "pending" as const, ratedAt: null } : m;
      setItems((curr) => curr.map(reset));
      setData((curr) => curr ? { ...curr, items: curr.items.map(reset) } : curr);
    } catch {
      // mantém estado atual se falhar
    }
  }

  async function handleDismissMovie(movieId: string) {
    try {
      await apiClient.post(`/dismissed/${movieId}`);
      setItems((curr) => curr.filter((m) => m.id !== movieId));
    } catch {
      // falha silenciosa — não remover o card se der erro
    }
  }

  useEffect(() => {
    loadRecommendations();
  }, []);

  const ratedMoviesCount = useMemo(
    () => items.filter((movie) => (movie.userRating ?? 0) > 0).length,
    [items],
  );

  const remainingRatingsToRefresh = Math.max(MIN_RATED_TO_REFRESH - ratedMoviesCount, 0);
  const canRefreshRecommendations = ratedMoviesCount >= MIN_RATED_TO_REFRESH;

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Não foi possível carregar suas recomendações
        </h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">{error}</p>
        <button
          onClick={() => loadRecommendations()}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Nenhuma recomendação ainda
        </h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
          Avalie mais alguns filmes e volte aqui para ver recomendações mais personalizadas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Para Você
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Filmes recomendados com base nas suas preferências e avaliações.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <button
            onClick={handleRefreshRecommendations}
            disabled={isRefreshing || !canRefreshRecommendations}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {isRefreshing ? "Gerando mais filmes..." : "Quero mais recomendações"}
          </button>

          {!canRefreshRecommendations && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Avalie mais {remainingRatingsToRefresh}{" "}
              {remainingRatingsToRefresh === 1 ? "filme" : "filmes"} para liberar novas recomendações.
            </p>
          )}

          {canRefreshRecommendations && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Você já pode solicitar mais recomendações.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {data?.feed?.context && (
        <div className="flex flex-wrap gap-2">
          {data.feed.context.genres.slice(0, 4).map((genre) => (
            <span
              key={genre}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {getGenreLabel(genre, genre)}
            </span>
          ))}
          {data.feed.context.era && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Era: {data.feed.context.era}
            </span>
          )}
          {data.feed.context.popularity && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Popularidade: {data.feed.context.popularity}
            </span>
          )}
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Avaliados: {ratedMoviesCount}/{MIN_RATED_TO_REFRESH} para liberar mais
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((movie) => (
          <RecommendedMovieCard
            key={movie.feedItemId}
            movie={movie}
            onRate={handleRateMovie}
            onUnrate={handleUnrateMovie}
            onDismiss={handleDismissMovie}
            isSubmittingRating={isSubmittingRating}
          />
        ))}
      </div>
    </div>
  );
}
