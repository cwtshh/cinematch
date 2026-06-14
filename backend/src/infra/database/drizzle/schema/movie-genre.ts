// movie-genre.ts
import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { movie } from "./movie";
import { genre } from "./genre";

export const movieGenre = pgTable(
  "movie_genre",
  {
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movie.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.movieId, table.genreId] }),
    movieIdx: index("movie_genre_movie_id_idx").on(table.movieId),
    genreIdx: index("movie_genre_genre_id_idx").on(table.genreId),
  }),
);
