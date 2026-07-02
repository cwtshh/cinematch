import type { FastifyPluginAsync } from "fastify";
import {
  addToWatchlistHandler,
  getWatchlistHandler,
  removeFromWatchlistHandler,
} from "./watchlist.handler";

export const watchlistRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", getWatchlistHandler);
  app.post("/:movieId", addToWatchlistHandler);
  app.delete("/:movieId", removeFromWatchlistHandler);
};
