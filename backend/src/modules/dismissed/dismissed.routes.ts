import type { FastifyPluginAsync } from "fastify";
import {
  dismissMovieHandler,
  getDismissedMoviesHandler,
  undismissMovieHandler,
} from "./dismissed.handler";

export const dismissedRoutes: FastifyPluginAsync = async (app) => {
  app.post("/:movieId", dismissMovieHandler);
  app.delete("/:movieId", undismissMovieHandler);
  app.get("/", getDismissedMoviesHandler);
};
