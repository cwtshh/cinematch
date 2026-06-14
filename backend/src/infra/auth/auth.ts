import { betterAuth } from "better-auth";
import { db } from "../database/client";
import { env } from "@/main/env";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: env.DATABASE_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3333",
  ],
  emailAndPassword: {
    enabled: true,
  },
});
