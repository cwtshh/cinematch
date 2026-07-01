import { useEffect, useState } from "react";
import { Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHistory } from "../api/get-history";
import { HistoryMovieCard } from "../components/history-movie-card";
import type { HistoryItem, HistoryResponse } from "../types/history";

type Tab = "accessed" | "rated";

const SKELETON_COUNT = 8;

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div
          key={i}
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
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      {tab === "accessed" ? (
        <Clock className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
      ) : (
        <Star className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
      )}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {tab === "accessed"
          ? "Nenhum filme no seu histórico ainda."
          : "Você ainda não avaliou nenhum filme."}
      </p>
    </div>
  );
}

export function History() {
  const [activeTab, setActiveTab] = useState<Tab>("accessed");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await getHistory(controller.signal);
        setData(result);
      } catch (err) {
        if ((err as Error).name !== "CanceledError") {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar seu histórico.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const items: HistoryItem[] =
    activeTab === "accessed" ? (data?.accessed ?? []) : (data?.rated ?? []);

  const tabs: { id: Tab; label: string; count: number | null }[] = [
    {
      id: "accessed",
      label: "Acessados",
      count: data ? data.accessed.length : null,
    },
    {
      id: "rated",
      label: "Avaliados",
      count: data ? data.rated.length : null,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Histórico
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Filmes que você acessou e avaliou, do mais recente ao mais antigo.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  activeTab === tab.id
                    ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div
          key={activeTab}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {items.map((movie, index) => (
            <HistoryMovieCard
              key={movie.feedItemId}
              movie={movie}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
