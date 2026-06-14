import type { FastifyPluginAsync } from "fastify";

import { authRoutes } from "./http/auth.routes";

export const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, {
    prefix: "/auth",
  });
};
