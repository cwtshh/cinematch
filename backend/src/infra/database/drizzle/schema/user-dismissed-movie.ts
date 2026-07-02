import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { movie } from "./movie";

export const userDismissedMovie = pgTable(
  "user_dismissed_movie",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movie.id, { onDelete: "cascade" }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userMovieUnique: unique("user_dismissed_movie_unique").on(table.userId, table.movieId),
  }),
);
