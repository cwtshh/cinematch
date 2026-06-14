import { db } from "../client";
import { genre } from "../drizzle/schema/genre";

const genres: { slug: string; label: string }[] = [
  { slug: "action", label: "Action" },
  { slug: "adventure", label: "Adventure" },
  { slug: "animation", label: "Animation" },
  { slug: "children", label: "Children" },
  { slug: "comedy", label: "Comedy" },
  { slug: "crime", label: "Crime" },
  { slug: "documentary", label: "Documentary" },
  { slug: "drama", label: "Drama" },
  { slug: "fantasy", label: "Fantasy" },
  { slug: "film_noir", label: "Film-Noir" },
  { slug: "horror", label: "Horror" },
  { slug: "imax", label: "IMAX" },
  { slug: "musical", label: "Musical" },
  { slug: "mystery", label: "Mystery" },
  { slug: "romance", label: "Romance" },
  { slug: "sci_fi", label: "Sci-Fi" },
  { slug: "thriller", label: "Thriller" },
  { slug: "war", label: "War" },
  { slug: "western", label: "Western" },
];

async function main() {
  await db.insert(genre).values(genres).onConflictDoNothing();

  console.log(`Seeded ${genres.length} genres`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to seed genres:", error);
  process.exit(1);
});
