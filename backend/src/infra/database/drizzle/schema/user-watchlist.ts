import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { movie } from "./movie";

export const userWatchlist = pgTable(
  "user_watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movie.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userMovieUnique: unique("user_watchlist_user_movie_unique").on(table.userId, table.movieId),
  }),
);
