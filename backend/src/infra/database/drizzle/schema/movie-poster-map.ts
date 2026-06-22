import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { movie } from "./movie";

export const moviePosterMap = pgTable(
  "movie_poster_map",
  {
    movieId: uuid("movie_id")
      .primaryKey()
      .references(() => movie.id, { onDelete: "cascade", onUpdate: "cascade" }),

    sourceMovieId: integer("source_movie_id").notNull(),

    tmdbId: integer("tmdb_id").notNull(),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    matchedTitle: text("matched_title"),
    matchedYear: integer("matched_year"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("movie_poster_map_tmdb_id_key").on(table.tmdbId),
    uniqueIndex("movie_poster_map_source_movie_id_key").on(table.sourceMovieId),
    index("movie_poster_map_matched_title_idx").on(table.matchedTitle),
  ],
);
