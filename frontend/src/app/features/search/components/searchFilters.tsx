import { useState, useEffect, useRef } from "react";
import { Search, Film, Hash, X } from "lucide-react";
import { getMovies } from "../api/getMovies"; 
import type { SearchFiltersState, SearchMovieItem } from "../types/Search";

type SearchFiltersProps = {
  filters: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function SearchFilters({ filters, onChange, onSubmit, isLoading }: SearchFiltersProps) {
  const [suggestions, setSuggestions] = useState<SearchMovieItem[]>([]);
  const [isShowingSuggestions, setIsShowingSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filters.title.trim().length < 3) {
      setSuggestions([]);
      setIsShowingSuggestions(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsFetchingSuggestions(true);
        const response = await getMovies({ ...filters, title: filters.title }, 1);
        setSuggestions(response.data.slice(0, 5));
        setIsShowingSuggestions(true);
      } catch (error) {
        console.error("Erro ao buscar sugestões", error);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [filters.title]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsShowingSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (movie: SearchMovieItem) => {
    onChange({ ...filters, title: movie.title });
    setIsShowingSuggestions(false);
  };

  const inputClasses =
    "w-full rounded-xl border border-zinc-300 bg-transparent pl-10 pr-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:text-zinc-100 dark:focus:border-teal-500 [color-scheme:dark]";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIsShowingSuggestions(false);
        onSubmit();
      }}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative flex flex-col space-y-2" ref={dropdownRef}>
          <label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nome do filme
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="title"
              type="text"
              autoComplete="off"
              placeholder="Ex: Matrix, Titanic..."
              value={filters.title}
              onChange={(e) => onChange({ ...filters, title: e.target.value })}
              onFocus={() => suggestions.length > 0 && setIsShowingSuggestions(true)}
              className={inputClasses}
            />
            {filters.title && (
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, title: "" });
                  setSuggestions([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isShowingSuggestions && (
            <div className="absolute top-18 z-50 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              {isFetchingSuggestions ? (
                <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Buscando...</div>
              ) : suggestions.length > 0 ? (
                <ul className="max-h-60 overflow-auto py-1">
                  {suggestions.map((movie) => (
                    <li key={movie.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSuggestion(movie)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">{movie.title}</span>
                        {movie.releaseYear && <span className="ml-2 text-xs text-zinc-500">{movie.releaseYear}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <label htmlFor="genreText" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Gênero
          </label>
          <div className="relative">
            <Film className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="genreText"
              type="text"
              placeholder="Ex: Ação, Terror..."
              value={filters.genreText}
              onChange={(e) => onChange({ ...filters, genreText: e.target.value })}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <label htmlFor="year" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Ano de lançamento
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="year"
              type="number"
              placeholder="Ex: 2014"
              value={filters.year}
              onChange={(e) => onChange({ ...filters, year: e.target.value })}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-8 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300 sm:w-auto"
        >
          <Search className="h-4 w-4" />
          {isLoading ? "Buscando..." : "Pesquisar"}
        </button>
      </div>
    </form>
  );
}