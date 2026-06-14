// genre.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const genre = pgTable("genre", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
