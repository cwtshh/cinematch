import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/modules/auth/http/require-auth";
import { rateMovieHandler, unrateMovieHandler } from "./movies.handler";

export async function moviesRoutes(app: FastifyInstance) {
  app.post("/:movieId/rate", { preHandler: [requireAuth] }, rateMovieHandler);
  app.delete("/:movieId/rate", { preHandler: [requireAuth] }, unrateMovieHandler);
}
