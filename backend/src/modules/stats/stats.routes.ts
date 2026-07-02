import type { FastifyPluginAsync } from "fastify";
import { getStatsHandler } from "./stats.handler";

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", getStatsHandler);
};
