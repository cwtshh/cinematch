import { apiClient } from "@/lib/axios";
import type { ActiveRecommendationsResponse } from "../types/recommendation";

export async function getActiveRecommendations(
  signal?: AbortSignal,
): Promise<ActiveRecommendationsResponse> {
  try {
    console.log("CU");
    const response = await apiClient.get<ActiveRecommendationsResponse>(
      "/recommendations/active",
      {
        signal,
      },
    );

    return response.data;
  } catch (error) {
    throw new Error("Não foi possível carregar suas recomendações.", {
      cause: error,
    });
  }
}
