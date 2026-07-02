import { useEffect, useState } from "react";
import { Clock, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHistory } from "../api/get-history";
import { HistoryMovieCard } from "../components/history-movie-card";
import type { HistoryItem } from "../types/history";

type Tab = "accessed" | "rated";

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
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
        {tab === "accessed" ? "Nenhum filme no seu histórico ainda." : "Você ainda não avaliou nenhum filme."}
      </p>
    </div>
  );
}

function Pagination({ page, hasMore, onPageChange }: { page: number; hasMore: boolean; onPageChange: (p: number) => void }) {
  if (page === 1 && !hasMore) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = hasMore ? page + 2 : page;
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">1</button>
          {start > 2 && <span className="px-1 text-zinc-400">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition",
            p === page
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800",
          )}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function History() {
  const [activeTab, setActiveTab] = useState<Tab>("accessed");
  const [accessed, setAccessed] = useState<HistoryItem[]>([]);
  const [rated, setRated] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalAccessed, setTotalAccessed] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(page: number) {
    try {
      setIsLoading(true);
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });

      const result = await getHistory(page);
      setAccessed(result.accessed);
      setRated(result.rated);
      setHasMore(result.hasMore);
      setTotalAccessed(result.totalAccessed);
      setCurrentPage(page);
    } catch {
      setError("Não foi possível carregar seu histórico.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPage(1);
  }, []);

  function handleRated(movieId: string, newRating: number | null) {
    if (newRating === null) {
      // unrate: volta accessed para pending, remove de rated
      setAccessed((prev) =>
        prev.map((item) =>
          item.id === movieId
            ? { ...item, userRating: null, status: "pending" as const, ratedAt: null }
            : item,
        ),
      );
      setRated((prev) => prev.filter((item) => item.id !== movieId));
      return;
    }
    // atualiza accessed
    setAccessed((prev) =>
      prev.map((item) =>
        item.id === movieId
          ? { ...item, userRating: newRating, status: "rated" as const, ratedAt: new Date().toISOString() }
          : item,
      ),
    );
    // adiciona/atualiza em rated (sem duplicar)
    setRated((prev) => {
      const existing = prev.find((item) => item.id === movieId);
      if (existing) {
        return prev.map((item) =>
          item.id === movieId ? { ...item, userRating: newRating } : item,
        );
      }
      const source = accessed.find((item) => item.id === movieId);
      if (source) {
        return [{ ...source, userRating: newRating, status: "rated" as const, ratedAt: new Date().toISOString() }, ...prev];
      }
      return prev;
    });
  }

  const items: HistoryItem[] = activeTab === "accessed" ? accessed : rated;

  const tabs: { id: Tab; label: string; count: number | null }[] = [
    { id: "accessed", label: "Acessados", count: totalAccessed || null },
    { id: "rated", label: "Avaliados", count: rated.length || null },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <SkeletonGrid />
      </div>
    );
  }

  if (error && accessed.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Não foi possível carregar seu histórico</h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">{error}</p>
        <button onClick={() => loadPage(1)} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Histórico</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Filmes que você acessou e avaliou, do mais recente ao mais antigo.
        </p>
      </div>

      <div className="flex w-fit gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
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
            {tab.count !== null && tab.count > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                activeTab === tab.id
                  ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                  : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <>
          <div key={`${activeTab}-${currentPage}`} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((movie, index) => (
              <HistoryMovieCard key={movie.feedItemId} movie={movie} index={index} allowUnrate={activeTab === "accessed"} onRated={handleRated} />
            ))}
          </div>

          {activeTab === "accessed" && (
            <Pagination page={currentPage} hasMore={hasMore} onPageChange={loadPage} />
          )}
        </>
      )}
    </div>
  );
}
