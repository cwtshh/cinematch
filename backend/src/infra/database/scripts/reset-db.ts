// src/infrastructure/database/scripts/reset-db.ts
import { sql } from "drizzle-orm";
import { db } from "../client";

async function main() {
  console.log("Dropping public schema...");
  await db.execute(sql.raw(`DROP SCHEMA IF EXISTS public CASCADE;`));

  console.log("Recreating public schema...");
  await db.execute(sql.raw(`CREATE SCHEMA public;`));

  console.log("Granting schema privileges...");
  await db.execute(sql.raw(`GRANT ALL ON SCHEMA public TO public;`));

  console.log("Database reset completed.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to reset database:", error);
  process.exit(1);
});
