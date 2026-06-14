// src/@types/fastify.d.ts
import type { db } from "@/infrastructure/database/client";
import type { pool } from "@/infrastructure/database/client";

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
