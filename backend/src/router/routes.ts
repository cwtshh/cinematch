import { aiInferenceRoutes } from "@/modules/ai-inference/http/routes";
import { authRoutes } from "@/modules/auth/http/auth.routes";
import { initialMovieRatingRoutes } from "@/modules/initial-movie-rating/initial-movie-rating.routes";
import { onBoardingRoutes } from "@/modules/on-boarding/http/on-boarding.routes";
import { recommendationsRoutes } from "@/modules/recommendations/recommendations.route";
import type { FastifyPluginAsync } from "fastify";

export const appRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes);
  await app.register(onBoardingRoutes, { prefix: "/on-boarding" });
  await app.register(initialMovieRatingRoutes, {
    prefix: "/initial-movie-rating",
  });
  await app.register(aiInferenceRoutes, { prefix: "/inference" });
  await app.register(recommendationsRoutes, { prefix: "/recommendations" });
};
