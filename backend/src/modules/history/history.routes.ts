import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/modules/auth/http/require-auth";
import { getHistoryHandler } from "./history.handler";

export async function historyRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, getHistoryHandler);
}
