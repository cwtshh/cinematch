import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/modules/auth/http/require-auth";
import {
  getActiveRecommendationsHandler,
  rateRecommendationHandler,
  refreshRecommendationsHandler,
} from "./recommendations.handler";

export async function recommendationsRoutes(app: FastifyInstance) {
  app.get("/active", { preHandler: [requireAuth] }, getActiveRecommendationsHandler);
  app.post("/:feedItemId/rate", { preHandler: [requireAuth] }, rateRecommendationHandler);
  app.post("/refresh", { preHandler: [requireAuth] }, refreshRecommendationsHandler);
}
