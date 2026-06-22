import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "@/modules/auth/http/require-auth";
import {
  getMoviesToRateHandler,
  submitInitialMovieRatingsHandler,
} from "./initial-movie-rating.handler";

export const initialMovieRatingRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/movies",
    {
      preHandler: [requireAuth],
    },
    getMoviesToRateHandler,
  );

  app.post(
    "/",
    {
      preHandler: [requireAuth],
    },
    submitInitialMovieRatingsHandler,
  );
};
