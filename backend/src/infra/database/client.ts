import { env } from "@/main/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as appSchema from "@/infra/database/drizzle/schema";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema: appSchema,
});
