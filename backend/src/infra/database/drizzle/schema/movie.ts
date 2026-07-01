// movie.ts
import { integer, pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";

export const movie = pgTable("movie", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceMovieId: integer("source_movie_id").notNull().unique(),
  title: text("title").notNull(),
  releaseYear: integer("release_year"),
  releaseDate: date("release_date"),
  popularityBucket: text("popularity_bucket"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
