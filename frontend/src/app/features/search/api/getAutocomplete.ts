import { apiClient } from "@/lib/axios";
import type { AutocompleteResponse } from "../types/Search";

export async function getAutocomplete(query: string, limit = 8) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });

  const { data } = await apiClient.get<AutocompleteResponse>(
    `/search/autocomplete?${params.toString()}`,
  );

  return data;
}
