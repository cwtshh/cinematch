import type { FastifyInstance } from "fastify";
import { getHistoryHandler } from "./history.handler";

export async function historyRoutes(app: FastifyInstance) {
  app.get("/", getHistoryHandler);
}
