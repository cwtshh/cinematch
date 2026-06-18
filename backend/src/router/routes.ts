import { authRoutes } from "@/modules/auth/http/auth.routes";
import { onBoardingRoutes } from "@/modules/on-boarding/http/on-boarding.routes";
import type { FastifyPluginAsync } from "fastify";

export const appRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes);
  await app.register(onBoardingRoutes, { prefix: "/on-boarding" });
};
