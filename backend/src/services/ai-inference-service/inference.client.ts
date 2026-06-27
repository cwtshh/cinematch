import axios from "axios";
import { env } from "@/main/env";
import type { RecommendPayload, RecommendResponse } from "./inference.types";

export const inferenceClient = axios.create({
  baseURL: env.INFERENCE_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export async function requestRecommendations(payload: RecommendPayload) {
  const { data } = await inferenceClient.post<RecommendResponse>(
    "/recommend",
    payload,
  );

  return data;
}
