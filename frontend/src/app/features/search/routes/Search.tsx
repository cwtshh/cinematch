import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { SearchFilters } from "../components/searchFilters";
import { MovieCard } from "../components/movieCard";
import { getMovies } from "../api/getMovies";
import type { SearchFiltersState, SearchMovieItem } from "../types/Search";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/axios";

function Pagination({
  page,
  hasMore,
  onPageChange,
}: {
  page: number;
  hasMore: boolean;
  onPageChange: (p: number) => void;
}) {
  if (page === 1 && !hasMore) return null;

  const pages: number[] = [];
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
          <button
            onClick={() => onPageChange(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            1
          </button>
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

export function Search() {
  const [filters, setFilters] = useState<SearchFiltersState>({
    title: "",
    year: "",
    genreText: "",
  });

  const [movies, setMovies] = useState<SearchMovieItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<SearchFiltersState>({
    title: "",
    year: "",
    genreText: "",
  });

  async function runSearch(searchFilters: SearchFiltersState, page: number) {
    try {
      setIsLoading(true);
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });

      const response = await getMovies(searchFilters, page);
      setMovies(response.data);
      setHasMore(response.meta.hasMore);
      setCurrentPage(page);
      setHasSearched(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Não foi possível buscar os filmes.");
      } else {
        setError("Ocorreu um erro inesperado.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch() {
    const hasActiveFilters =
      filters.title.trim() || filters.year.trim() || filters.genreText.trim();

    if (!hasActiveFilters) {
      setMovies([]);
      setHasMore(false);
      setHasSearched(false);
      return;
    }

    setActiveFilters(filters);
    await runSearch(filters, 1);
  }

  async function handlePageChange(page: number) {
    await runSearch(activeFilters, page);
  }

  async function handleDismiss(movieId: string) {
    setMovies((curr) => curr.filter((m) => m.id !== movieId));
    try {
      await apiClient.post(`/dismissed/${movieId}`);
    } catch {
      // se falhar, o card já sumiu — comportamento aceitável para busca
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Buscar
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Encontre filmes específicos.
        </p>
      </div>

      <SearchFilters
        filters={filters}
        onChange={setFilters}
        onSubmit={handleSearch}
        isLoading={isLoading}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !hasSearched && (
        <div className="mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-2 text-center opacity-60">
          <p className="text-base font-medium text-zinc-400">
            Digite os parâmetros acima e clique em Pesquisar para buscar filmes.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {!isLoading && hasSearched && movies.length === 0 && !error && (
        <div className="flex flex-col py-2 opacity-80">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum resultado encontrado para os filtros selecionados.
          </p>
        </div>
      )}

      {!isLoading && hasSearched && movies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {movies.length} resultado{movies.length !== 1 ? "s" : ""} — página {currentPage}
            </h3>
          </div>

          <div
            key={`search-${currentPage}`}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
              >
                <MovieCard movie={movie} onDismiss={handleDismiss} />
              </div>
            ))}
          </div>

          <Pagination
            page={currentPage}
            hasMore={hasMore}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
