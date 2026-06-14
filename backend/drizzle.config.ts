import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/database/drizzle/schema/**/*.ts",
  out: "./src/infra/database/drizzle/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://user:password@localhost:5432/mydb",
  },
});
