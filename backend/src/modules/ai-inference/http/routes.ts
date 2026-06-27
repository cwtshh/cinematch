import type { FastifyInstance } from "fastify";
import { generateRecommendationsHandler } from "../ai-inference.handler";

export async function aiInferenceRoutes(app: FastifyInstance) {
  app.post("/generate", generateRecommendationsHandler);
}
