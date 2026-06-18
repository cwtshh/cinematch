import "fastify";
import type { db, pool } from "@/infra/database/client";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
    pg: typeof pool;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
    session?: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
  }
}

export {};
