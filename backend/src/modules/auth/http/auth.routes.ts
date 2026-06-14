import type { FastifyPluginAsync } from "fastify";
import { handleAuthRequest } from "./auth.handler";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    url: "/*",
    handler: handleAuthRequest,
  });
};
