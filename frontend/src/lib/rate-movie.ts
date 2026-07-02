import { apiClient } from "@/lib/axios";

export async function rateMovie(movieId: string, rating: number): Promise<void> {
  await apiClient.post(`/movies/${movieId}/rate`, { rating });
}
