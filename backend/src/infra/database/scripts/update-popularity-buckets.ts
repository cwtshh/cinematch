import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { movie } from "../drizzle/schema/movie";

type PopularityEntry = {
  sourceMovieId: number;
  popularityBucket: string;
};

async function main() {
  const raw = readFileSync("/app/popularity_data.json", "utf-8");
  const entries: PopularityEntry[] = JSON.parse(raw);

  console.log(`Atualizando ${entries.length} filmes...`);

  let updated = 0;
  let skipped = 0;

  const BATCH_SIZE = 500;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (entry) => {
        const result = await db
          .update(movie)
          .set({ popularityBucket: entry.popularityBucket })
          .where(eq(movie.sourceMovieId, entry.sourceMovieId))
          .returning({ id: movie.id });
        if (result.length > 0) updated++;
        else skipped++;
      }),
    );
    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`  Processados ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length}`);
    }
  }

  console.log(`\nConcluído: ${updated} atualizados, ${skipped} não encontrados no banco.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
