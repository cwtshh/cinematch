import { useEffect, useState } from "react";
import axios from "axios";
import { RecommendedMovieCard } from "../components/recommended-movie-card";
import type {
  ActiveRecommendationsResponse,
  RecommendationItem,
} from "../types/recommendation";
import { apiClient } from "@/lib/axios";

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

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
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | ApiErrorResponse
          | undefined;

        setError(
          responseData?.message ??
            responseData?.error ??
            "Não foi possível carregar suas recomendações.",
        );
      } else {
        setError("Ocorreu um erro inesperado.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRateMovie(feedItemId: string, rating: number) {
    try {
      setIsSubmittingRating(true);
      setError(null);

      await apiClient.post(`/recommendations/${feedItemId}/rate`, {
        rating,
      });

      setItems((currentItems) =>
        currentItems.map((movie) =>
          movie.feedItemId === feedItemId
            ? {
                ...movie,
                userRating: rating,
                status: "rated",
                ratedAt: new Date().toISOString(),
              }
            : movie,
        ),
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | ApiErrorResponse
          | undefined;

        setError(
          responseData?.message ??
            responseData?.error ??
            "Não foi possível salvar sua avaliação.",
        );
      } else {
        setError("Ocorreu um erro inesperado.");
      }
    } finally {
      setIsSubmittingRating(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadRecommendations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="aspect-2/3 animate-pulse bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
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
          Avalie mais alguns filmes e volte aqui para ver recomendações mais
          personalizadas.
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

        <button
          onClick={() => loadRecommendations({ silent: true })}
          disabled={isRefreshing}
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {isRefreshing ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {data?.feed?.context && (
        <div className="flex flex-wrap gap-2">
          {data.feed.context.genres.slice(0, 4).map((genre) => (
            <span
              key={genre}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {genre}
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
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((movie) => (
          <RecommendedMovieCard
            key={movie.feedItemId}
            movie={movie}
            onRate={handleRateMovie}
            isSubmittingRating={isSubmittingRating}
          />
        ))}
      </div>
    </div>
  );
}
