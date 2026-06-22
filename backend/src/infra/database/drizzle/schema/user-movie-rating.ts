import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { movie } from "./movie";

export const userMovieRating = pgTable(
  "user_movie_rating",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    movieId: uuid("movie_id")
      .notNull()
      .references(() => movie.id, { onDelete: "cascade" }),

    rating: real("rating").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.movieId] }),
    userIdx: index("user_movie_rating_user_id_idx").on(table.userId),
    movieIdx: index("user_movie_rating_movie_id_idx").on(table.movieId),
  }),
);
