import { betterAuth } from "better-auth";
import { db } from "../database/client";
import { env } from "@/main/env";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as authSchema from "@/infra/database/drizzle/schema/auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.ALLOWED_ORIGINS,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      hasCompletedOnboarding: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
    },
  },
  schema: authSchema,
});
