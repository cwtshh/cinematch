import fp from "fastify-plugin";
import { db, pool } from "../database/client";
import type { FastifyInstance } from "fastify";

export const databasePlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate("db", db);
  fastify.decorate("pg", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
