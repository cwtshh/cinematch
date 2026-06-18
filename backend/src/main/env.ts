import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  TMDB_API_READ_KEY: z.string().min(1),
  TMDB_API_TOKEN: z.string().min(1),
  ALLOWED_ORIGINS: z
    .string()
    .default(
      "http://localhost:3000,http://localhost:5173,http://localhost:3333",
    )
    .transform((str) => str.split(",").map((s) => s.trim())),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment variables:",
    parsedEnv.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;
