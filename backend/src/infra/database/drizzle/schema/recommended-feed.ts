import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const recommendedFeedStatusEnum = pgEnum("recommended_feed_status", [
  "active",
  "archived",
]);

export const recommendedFeed = pgTable(
  "recommended_feed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    status: recommendedFeedStatusEnum("status").notNull().default("active"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    context: jsonb("context").$type<{
      source: "initial-rating" | "refresh" | "manual";
      ratingsCount: number;
      genres: string[];
      era: string | null;
      popularity: string | null;
    }>(),
  },
  (table) => ({
    userStatusUnique: uniqueIndex("recommended_feed_user_status_unique").on(
      table.userId,
      table.status,
    ),
  }),
);
