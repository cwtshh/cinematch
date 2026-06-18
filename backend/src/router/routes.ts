import { authRoutes } from "@/modules/auth/http/auth.routes";
import type { FastifyPluginAsync } from "fastify";

export const appRoutes: FastifyPluginAsync = async (app) => {
  await await app.register(authRoutes);
};
