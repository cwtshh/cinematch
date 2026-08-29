import { apiClient } from "@/lib/axios";
import type {
  SearchMode,
  SearchMoviesResponse,
  SearchFiltersState,
} from "../types/Search";

export async function getMovies(
  filters: SearchFiltersState,
  page = 1,
  mode: SearchMode = "sql",
) {
  const params = new URLSearchParams();

  if (filters.title) params.append("title", filters.title);
  if (filters.year) params.append("year", filters.year);
  if (filters.genreText) params.append("genreText", filters.genreText);
  params.append("page", page.toString());
  params.append("mode", mode);

  const { data } = await apiClient.get<SearchMoviesResponse>(
    `/search?${params.toString()}`,
  );

  return data;
}
