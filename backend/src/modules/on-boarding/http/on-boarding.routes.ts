import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "@/modules/auth/http/require-auth";
import {
  getPreferencesHandler,
  saveOnBoardingPreferencesHandler,
} from "./on-boarding.handler";
import type { SaveOnBoardingPreferencesBody } from "./on-boarding.schema";

export const onBoardingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/preferences", { preHandler: [requireAuth] }, getPreferencesHandler);

  app.post<{
    Body: SaveOnBoardingPreferencesBody;
  }>(
    "/preferences",
    { preHandler: [requireAuth] },
    saveOnBoardingPreferencesHandler,
  );
};
