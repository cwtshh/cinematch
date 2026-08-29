/**
 * Benchmark: ILIKE no Postgres versus indice de trigramas em memoria.
 *
 * Roda contra o banco real. Valida que os dois caminhos devolvem os
 * mesmos filmes ANTES de comparar tempos: sem isso, o benchmark poderia
 * estar medindo uma busca mais rapida e errada.
 *
 * Uso, a partir de backend/:
 *   bun run src/scripts/benchmark-busca.ts
 */

import { ilike, or } from "drizzle-orm";
import { db } from "@/infra/database/client";
import { movie } from "@/infra/database/drizzle/schema";
import { obterIndice } from "@/modules/search/shared/index-store";

const CONSULTAS = [
  "story", "matrix", "star wars", "love",
  "batman", "harry potter", "godfather", "zzzznaoexiste",
];

const REPETICOES = 30;

function estatisticas(amostras: number[]) {
  const ord = [...amostras].sort((a, b) => a - b);
  const n = ord.length;
  const p = (q: number) => ord[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))] as number;
  return { mediana: p(0.5), p95: p(0.95) };
}

async function buscaSql(termo: string): Promise<string[]> {
  const linhas = await db
    .select({ id: movie.id })
    .from(movie)
    .where(or(ilike(movie.title, `%${termo}%`), ilike(movie.tmdbTitle, `%${termo}%`)));
  return linhas.map((l) => l.id);
}

async function main() {
  console.log("Construindo indice...");
  const indice = await obterIndice();
  const stats = indice.estatisticas();

  console.log(`\nIndice construido em ${stats.tempoConstrucaoMs}ms`);
  console.log(`  filmes:                ${stats.filmes}`);
  console.log(`  textos indexados:      ${stats.textosIndexados} (title + tmdbTitle)`);
  console.log(`  trigramas distintos:   ${stats.trigramasDistintos}`);
  console.log(`  postagens totais:      ${stats.postagensTotais}`);
  console.log(`  baldes:                ${stats.tabela.baldes}`);
  console.log(`  fator de carga:        ${stats.tabela.fatorCarga}`);
  console.log(`  baldes vazios:         ${stats.tabela.baldesVazios} (${stats.tabela.pctVazios}%)`);
  console.log(`  maior corrente:        ${stats.tabela.maiorCorrente}`);
  console.log(`  corrente media global: ${stats.tabela.correnteMediaGlobal}`);
  console.log(`  colisoes na insercao:  ${stats.tabela.colisoesInsercao}`);

  console.log("\nEquivalencia dos resultados:");
  for (const termo of CONSULTAS) {
    const sql = new Set(await buscaSql(termo));
    const idx = new Set(indice.buscar(termo));

    let soSql = 0;
    for (const id of sql) if (!idx.has(id)) soSql++;
    let soIdx = 0;
    for (const id of idx) if (!sql.has(id)) soIdx++;

    const marca = soSql === 0 && soIdx === 0 ? "identico" : `sql=${sql.size} idx=${idx.size} (so idx: ${soIdx}, so sql: ${soSql})`;
    console.log(`  "${termo}": ${idx.size} resultados — ${marca}`);
  }

  console.log("\nLatencia:\n");
  console.log("consulta".padEnd(16) + "res".padStart(6) + "sql med".padStart(11) +
    "sql p95".padStart(10) + "idx med".padStart(11) + "idx p95".padStart(10) + "ganho".padStart(9));
  console.log("-".repeat(73));

  const csv = ["consulta,resultados,sql_mediana_ms,sql_p95_ms,indice_mediana_ms,indice_p95_ms,ganho"];

  for (const termo of CONSULTAS) {
    const tSql: number[] = [];
    const tIdx: number[] = [];

    await buscaSql(termo);
    indice.buscar(termo);

    for (let i = 0; i < REPETICOES; i++) {
      const a = performance.now();
      await buscaSql(termo);
      tSql.push(performance.now() - a);

      const b = performance.now();
      indice.buscar(termo);
      tIdx.push(performance.now() - b);
    }

    const s = estatisticas(tSql);
    const x = estatisticas(tIdx);
    const ganho = x.mediana > 0 ? s.mediana / x.mediana : Infinity;
    const qtd = indice.buscar(termo).length;

    console.log(termo.padEnd(16) + String(qtd).padStart(6) +
      `${s.mediana.toFixed(2)}ms`.padStart(11) + `${s.p95.toFixed(2)}ms`.padStart(10) +
      `${x.mediana.toFixed(3)}ms`.padStart(11) + `${x.p95.toFixed(3)}ms`.padStart(10) +
      `${ganho.toFixed(0)}x`.padStart(9));

    csv.push([termo, qtd, s.mediana.toFixed(4), s.p95.toFixed(4),
      x.mediana.toFixed(4), x.p95.toFixed(4), ganho.toFixed(1)].join(","));
  }

  const hist = indice.distribuicaoBaldes();
  const cont = new Map<number, number>();
  for (const c of hist) cont.set(c, (cont.get(c) ?? 0) + 1);

  const alpha = stats.tabela.correnteMediaGlobal;
  console.log("\nDistribuicao dos baldes (observado vs Poisson esperado):");
  console.log("  k | observado |  esperado");

  let fat = 1;
  const csvHist = ["k,observado,poisson_esperado"];
  for (let k = 0; k <= 8; k++) {
    if (k > 0) fat *= k;
    const esp = (stats.tabela.baldes * Math.exp(-alpha) * alpha ** k) / fat;
    console.log(`  ${k} | ${String(cont.get(k) ?? 0).padStart(9)} | ${esp.toFixed(1).padStart(9)}`);
    csvHist.push(`${k},${cont.get(k) ?? 0},${esp.toFixed(2)}`);
  }

  await Bun.write("resultados/latencia.csv", csv.join("\n"));
  await Bun.write("resultados/histograma-baldes.csv", csvHist.join("\n"));
  console.log("\nGravado em resultados/");

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
