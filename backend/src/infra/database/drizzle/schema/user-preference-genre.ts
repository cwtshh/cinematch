import { index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { genre } from "./genre";

export const userPreferenceGenre = pgTable(
  "user_preference_genre",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.genreId] }),
    userIdx: index("user_preference_genre_user_id_idx").on(table.userId),
    genreIdx: index("user_preference_genre_genre_id_idx").on(table.genreId),
  }),
);
