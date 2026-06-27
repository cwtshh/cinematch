import type { FastifyInstance } from "fastify";
import {
  getActiveRecommendationsHandler,
  rateRecommendationHandler,
} from "./recommendations.handler";

export async function recommendationsRoutes(app: FastifyInstance) {
  app.get("/active", getActiveRecommendationsHandler);
  app.post("/:feedItemId/rate", rateRecommendationHandler);
}
