import { apiClient } from "@/lib/axios";
import type { HistoryResponse } from "../types/history";

export async function getHistory(signal?: AbortSignal): Promise<HistoryResponse> {
  const response = await apiClient.get<HistoryResponse>("/history", { signal });
  return response.data;
}
