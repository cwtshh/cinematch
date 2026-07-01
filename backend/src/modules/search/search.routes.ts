import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "@/modules/auth/http/require-auth";
import { searchMoviesHandler } from "./search.handler";

export const searchroutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [requireAuth] }, searchMoviesHandler);
};