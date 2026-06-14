import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { eq } from "drizzle-orm";
import { genre } from "../drizzle/schema/genre";
import { db } from "../client";
import { movie } from "../drizzle/schema/movie";
import { movieGenre } from "../drizzle/schema/movie-genre";

type CsvMovieRow = {
  movieId: string;
  title: string;
  Action: string;
  Adventure: string;
  Animation: string;
  Children: string;
  Comedy: string;
  Crime: string;
  Documentary: string;
  Drama: string;
  Fantasy: string;
  "Film-Noir": string;
  Horror: string;
  IMAX: string;
  Musical: string;
  Mystery: string;
  Romance: string;
  "Sci-Fi": string;
  Thriller: string;
  War: string;
  Western: string;
};

const GENRE_COLUMN_TO_SLUG = {
  Action: "action",
  Adventure: "adventure",
  Animation: "animation",
  Children: "children",
  Comedy: "comedy",
  Crime: "crime",
  Documentary: "documentary",
  Drama: "drama",
  Fantasy: "fantasy",
  "Film-Noir": "film_noir",
  Horror: "horror",
  IMAX: "imax",
  Musical: "musical",
  Mystery: "mystery",
  Romance: "romance",
  "Sci-Fi": "sci_fi",
  Thriller: "thriller",
  War: "war",
  Western: "western",
} as const;

function extractReleaseYear(title: string): number | null {
  const match = title.match(/\((\d{4})\)$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);

  return Number.isNaN(year) ? null : year;
}

async function readCsv(filePath: string): Promise<CsvMovieRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvMovieRow[] = [];

    createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }),
      )
      .on("data", (row: CsvMovieRow) => {
        rows.push(row);
      })
      .on("end", () => resolve(rows))
      .on("error", (error) => reject(error));
  });
}

async function main() {
  const csvFilePath = "./data/movies.csv";
  const rows = await readCsv(csvFilePath);

  const genres = await db.select().from(genre);

  const genreBySlug = new Map(genres.map((item) => [item.slug, item.id]));

  let importedCount = 0;

  for (const row of rows) {
    const sourceMovieId = Number(row.movieId);

    if (Number.isNaN(sourceMovieId)) {
      throw new Error(`Invalid movieId: ${row.movieId}`);
    }

    const releaseYear = extractReleaseYear(row.title);

    const [upsertedMovie] = await db
      .insert(movie)
      .values({
        sourceMovieId,
        title: row.title,
        releaseYear: releaseYear ?? undefined,
      })
      .onConflictDoUpdate({
        target: movie.sourceMovieId,
        set: {
          title: row.title,
          releaseYear: releaseYear ?? undefined,
        },
      })
      .returning({
        id: movie.id,
      });

    if (!upsertedMovie) {
      throw new Error(`Failed to upsert movie ${row.title}`);
    }

    await db.delete(movieGenre).where(eq(movieGenre.movieId, upsertedMovie.id));

    const movieGenresToInsert = Object.entries(GENRE_COLUMN_TO_SLUG)
      .filter(([columnName]) => row[columnName as keyof CsvMovieRow] === "1")
      .map(([, slug]) => {
        const genreId = genreBySlug.get(slug);

        if (!genreId) {
          throw new Error(`Genre not found for slug: ${slug}`);
        }

        return {
          movieId: upsertedMovie.id,
          genreId,
        };
      });

    if (movieGenresToInsert.length > 0) {
      await db
        .insert(movieGenre)
        .values(movieGenresToInsert)
        .onConflictDoNothing();
    }

    importedCount += 1;
  }

  console.log(`Imported ${importedCount} movies successfully.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to import movies:", error);
  process.exit(1);
});
