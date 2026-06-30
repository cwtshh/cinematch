import type { FastifyPluginAsync } from "fastify";
import { searchMoviesHandler } from "./search.handler";

export const searchroutes: FastifyPluginAsync = async (app) => {
  app.get("/", searchMoviesHandler);
};