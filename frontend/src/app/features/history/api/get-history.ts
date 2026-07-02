import { apiClient } from "@/lib/axios";
import type { HistoryResponse } from "../types/history";

export async function getHistory(page = 1, signal?: AbortSignal): Promise<HistoryResponse> {
  const response = await apiClient.get<HistoryResponse>(`/history?page=${page}`, { signal });
  return response.data;
}
