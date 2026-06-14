import { authRoutes } from "@/modules/auth/http/auth.routes";
import type { FastifyPluginAsync } from "fastify";

export const appRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, {
    prefix: "/auth",
  });
};
