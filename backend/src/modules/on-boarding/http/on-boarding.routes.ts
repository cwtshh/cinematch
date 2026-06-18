import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "@/modules/auth/http/require-auth";
import { saveOnBoardingPreferencesHandler } from "./on-boarding.handler";
import type { SaveOnBoardingPreferencesBody } from "./on-boarding.schema";

export const onBoardingRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Body: SaveOnBoardingPreferencesBody;
  }>(
    "/preferences",
    {
      preHandler: [requireAuth],
    },
    saveOnBoardingPreferencesHandler,
  );
};
