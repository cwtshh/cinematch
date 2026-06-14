import { env } from "@/main/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool);
