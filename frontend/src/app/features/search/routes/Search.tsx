import { useState } from "react";
import axios from "axios";
import { SearchFilters } from "../components/searchFilters";
import { MovieCard } from "../components/movieCard";
import { getMovies } from "../api/getMovies";
import type { SearchFiltersState, SearchMovieItem } from "../types/Search";

export function Search() {
  const [filters, setFilters] = useState<SearchFiltersState>({
    title: "",
    year: "",
    genreText: "",
  });
  
  const [movies, setMovies] = useState<SearchMovieItem[]>([]);
  const [fallbackMovies, setFallbackMovies] = useState<SearchMovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const titleTrimmed = filters.title.trim();
    const hasActiveFilters = 
      titleTrimmed || 
      filters.year.trim() || 
      filters.genreText.trim() || 
      filters.releaseDateStart || 
      filters.releaseDateEnd;

    if (!hasActiveFilters) {
      setMovies([]);
      setFallbackMovies([]);
      setHasSearched(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setFallbackMovies([]); 
      
      const response = await getMovies(filters, 1);
      setMovies(response.data);
      setHasSearched(true);

   
      if (response.data.length < 3 && titleTrimmed.length > 0) {
        const fallbackResponse = await getMovies({
          title: titleTrimmed,
          year: "", 
          genreText: "", 
          releaseDateStart: "",
          releaseDateEnd: ""
        }, 1);

        const exactIds = new Set(response.data.map(m => m.id));
        const filteredFallback = fallbackResponse.data.filter(m => !exactIds.has(m.id));
        
        setFallbackMovies(filteredFallback);
      }
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 animate-fade-in duration-300">
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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 animate-shake">
          {error}
        </div>
      )}


      {!isLoading && !hasSearched && (
        <div className="mx-auto flex min-h-[40vh] w-full flex-col items-center justify-center gap-2 text-center opacity-60 transition-opacity duration-300">
          <p className="text-base font-medium text-zinc-400">
            Digite os parâmetros acima e clique em Pesquisar para buscar filmes.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 animate-pulse"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="aspect-2/3 bg-linear-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && hasSearched && movies.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Resultados exatos encontrados
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {movies.map((movie) => (
              <div key={movie.id} className="transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && hasSearched && movies.length === 0 && !error && (
        <div className="flex flex-col py-2 opacity-80 animate-in fade-in duration-300">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum resultado exato encontrado para os filtros selecionados.
          </p>
        </div>
      )}

      {/* Recomendações Ampliadas (Fallback) */}
      {!isLoading && hasSearched && fallbackMovies.length > 0 && (
        <div className="space-y-4 border-t border-zinc-200 pt-6 mt-4 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              Outros resultados para "{filters.title}"
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Filmes semelhantes encontrados sem a restrição de ano ou período.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {fallbackMovies.map((movie) => (
              <div key={movie.id} className="opacity-85 transition-all duration-300 hover:opacity-100 hover:scale-[1.02] hover:shadow-md">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}