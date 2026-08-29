/**
 * Benchmark: autocomplete por prefixo.
 *
 * Compara a varredura sequencial em memoria com a busca binaria sobre o
 * vetor ordenado, e mede tambem o ILIKE 'prefixo%' no banco.
 *
 * A metrica principal e o NUMERO DE COMPARACOES, que independe de
 * maquina e de ruido do sistema operacional.
 *
 * Uso, a partir de backend/:
 *   bun run src/scripts/benchmark-prefixo.ts
 */

import { ilike, or } from "drizzle-orm";
import { db } from "@/infra/database/client";
import { movie } from "@/infra/database/drizzle/schema";
import { normalizar } from "@/modules/search/trigram/trigram-index";
import { obterIndicePrefixo } from "@/modules/search/shared/index-store";
import type { Contador } from "@/modules/search/prefix/binary-search";

const PREFIXOS = ["t", "to", "toy", "star", "the god", "harry p", "matrix", "zzzz"];
const REPETICOES = 50;

function mediana(a: number[]): number {
  const o = [...a].sort((x, y) => x - y);
  return o[o.length >>> 1] as number;
}

function varreduraSequencial(titulos: string[], prefixo: string, c: Contador): number {
  const alvo = normalizar(prefixo);
  let n = 0;
  for (const t of titulos) {
    c.comparacoes++;
    if (t.startsWith(alvo)) n++;
  }
  return n;
}

async function main() {
  console.log("Construindo indice de prefixo...");
  const indice = await obterIndicePrefixo();
  const stats = indice.estatisticas();

  console.log(`\nIndice construido em ${stats.tempoConstrucaoMs}ms`);
  console.log(`  filmes:              ${stats.filmes}`);
  console.log(`  chaves no vetor:     ${stats.chaves}`);
  console.log(`  chaves alternativas: ${stats.chavesAlternativas} (artigos deslocados)`);

  const linhas = await db.select({ title: movie.title }).from(movie);
  const titulos = linhas.map((l) => normalizar(l.title)).sort();

  console.log("\nComparacoes por consulta:\n");
  console.log("prefixo".padEnd(12) + "achados".padStart(9) + "scan".padStart(10) +
    "binaria".padStart(10) + "reducao".padStart(10) + "sql med".padStart(11) + "bin med".padStart(11));
  console.log("-".repeat(73));

  const csv = ["prefixo,achados,comparacoes_scan,comparacoes_binaria,reducao,sql_mediana_ms,binaria_mediana_ms"];

  for (const prefixo of PREFIXOS) {
    const cScan: Contador = { comparacoes: 0 };
    varreduraSequencial(titulos, prefixo, cScan);

    const cBin: Contador = { comparacoes: 0 };
    const achados = indice.contarPorPrefixo(prefixo, cBin);

    const tSql: number[] = [];
    const tBin: number[] = [];

    const consultaSql = () =>
      db.select({ id: movie.id }).from(movie)
        .where(or(ilike(movie.title, `${prefixo}%`), ilike(movie.tmdbTitle, `${prefixo}%`)));

    await consultaSql();
    indice.buscarPorPrefixo(prefixo, 10);

    for (let i = 0; i < REPETICOES; i++) {
      const a = performance.now();
      await consultaSql();
      tSql.push(performance.now() - a);

      const b = performance.now();
      indice.buscarPorPrefixo(prefixo, 10);
      tBin.push(performance.now() - b);
    }

    const mSql = mediana(tSql);
    const mBin = mediana(tBin);
    const red = cBin.comparacoes > 0 ? cScan.comparacoes / cBin.comparacoes : Infinity;

    console.log(prefixo.padEnd(12) + String(achados).padStart(9) +
      String(cScan.comparacoes).padStart(10) + String(cBin.comparacoes).padStart(10) +
      `${red.toFixed(0)}x`.padStart(10) + `${mSql.toFixed(2)}ms`.padStart(11) +
      `${mBin.toFixed(4)}ms`.padStart(11));

    csv.push([prefixo, achados, cScan.comparacoes, cBin.comparacoes,
      red.toFixed(1), mSql.toFixed(4), mBin.toFixed(4)].join(","));
  }

  const log2 = Math.log2(stats.chaves);
  console.log(`\nTeoria: ceil(log2(${stats.chaves})) = ${Math.ceil(log2)} comparacoes por busca binaria.`);
  console.log(`Cada consulta faz DUAS (lowerBound e upperBound), logo ~${2 * Math.ceil(log2)} por prefixo.`);

  await Bun.write("resultados/prefixo.csv", csv.join("\n"));
  console.log("\nGravado em resultados/prefixo.csv");

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
