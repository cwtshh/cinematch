/**
 * Tradução de títulos do movies.csv para PT-BR via API do TMDB.
 *
 * Uso:
 *   cd backend/
 *   bun run src/infra/database/scripts/translate-movies-csv.ts
 *
 * Saída:
 *   data/movies-ptbr.csv          — CSV com títulos traduzidos
 *   data/translate-progress.jsonl — checkpoint para retomar se cair
 *
 * Para retomar uma execução interrompida, basta rodar novamente.
 * O script pula automaticamente os filmes já processados.
 */

import { config } from "dotenv";
import { join } from "node:path";
import {
  createReadStream,
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { parse } from "csv-parse";
import axios from "axios";

// Carrega variáveis de ambiente (tenta .env.dev primeiro, depois .env)
config({ path: join(import.meta.dir, "../../../../env/.env.dev"), override: false });
config({ path: join(import.meta.dir, "../../../../env/.env"), override: false });
config({ path: join(import.meta.dir, "../../../../.env"), override: false });

const TMDB_TOKEN = process.env.TMDB_API_TOKEN;

if (!TMDB_TOKEN) {
  console.error("Erro: TMDB_API_TOKEN não encontrado no arquivo de ambiente.");
  process.exit(1);
}

// ── Configuração ──────────────────────────────────────────────────────────────

const DATA_DIR = join(import.meta.dir, "../../../../data");
const INPUT_CSV = join(DATA_DIR, "movies.csv");
const OUTPUT_CSV = join(DATA_DIR, "movies-ptbr.csv");
const PROGRESS_FILE = join(DATA_DIR, "translate-progress.jsonl");

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 350;
const MAX_YEAR_DIFF = 1;

// ── Tipos ─────────────────────────────────────────────────────────────────────

type CsvRow = { movieId: string; title: string; [key: string]: string };

type ProgressEntry = {
  id: number;
  ptbr: string;
  translated: boolean;
};

type TmdbSearchResult = {
  title: string;
  release_date?: string;
};

type TmdbSearchResponse = {
  results: TmdbSearchResult[];
};

// ── Helpers de CSV ────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function readCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on("data", (row: CsvRow) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// ── Checkpoint ────────────────────────────────────────────────────────────────

function carregarProgresso(): Map<number, ProgressEntry> {
  if (!existsSync(PROGRESS_FILE)) return new Map();
  const linhas = readFileSync(PROGRESS_FILE, "utf-8").split("\n").filter(Boolean);
  const mapa = new Map<number, ProgressEntry>();
  for (const linha of linhas) {
    try {
      const entrada = JSON.parse(linha) as ProgressEntry;
      mapa.set(entrada.id, entrada);
    } catch {
      // Linha corrompida — ignora
    }
  }
  return mapa;
}

function salvarProgresso(entradas: ProgressEntry[]): void {
  const conteudo = entradas.map((e) => JSON.stringify(e)).join("\n") + "\n";
  appendFileSync(PROGRESS_FILE, conteudo);
}

// ── TMDB ──────────────────────────────────────────────────────────────────────

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  timeout: 10_000,
  headers: {
    Authorization: `Bearer ${TMDB_TOKEN}`,
    "Content-Type": "application/json",
  },
});

function extrairAno(titulo: string): number | null {
  const match = titulo.match(/\((\d{4})\)\s*$/);
  return match ? Number(match[1]) : null;
}

function extrairTituloLimpo(titulo: string): string {
  return titulo.replace(/\s*\(\d{4}\)\s*$/, "").trim();
}

async function buscarTituloPtBr(
  tituloOriginal: string,
): Promise<{ ptbr: string; translated: boolean }> {
  const ano = extrairAno(tituloOriginal);
  const tituloLimpo = extrairTituloLimpo(tituloOriginal);

  try {
    const { data } = await tmdb.get<TmdbSearchResponse>("/search/movie", {
      params: {
        query: tituloLimpo,
        language: "pt-BR",
        page: 1,
        ...(ano ? { year: ano } : {}),
      },
    });

    const resultados = data.results ?? [];
    if (resultados.length === 0) {
      return { ptbr: tituloOriginal, translated: false };
    }

    const melhor = resultados[0]!;

    // Verifica se o ano do resultado bate com o do CSV (tolerância de 1 ano)
    if (ano && melhor.release_date) {
      const anoResultado = Number(melhor.release_date.substring(0, 4));
      if (Math.abs(anoResultado - ano) > MAX_YEAR_DIFF) {
        return { ptbr: tituloOriginal, translated: false };
      }
    }

    const tituloPtBr = melhor.title;
    const sufixoAno = ano ? ` (${ano})` : "";
    const foiTraduzido =
      tituloPtBr.toLowerCase() !== tituloLimpo.toLowerCase();

    return {
      ptbr: `${tituloPtBr}${sufixoAno}`,
      translated: foiTraduzido,
    };
  } catch {
    return { ptbr: tituloOriginal, translated: false };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Iniciando tradução de títulos para PT-BR...\n");

  const todasLinhas = await readCsv(INPUT_CSV);
  console.log(`CSV carregado: ${todasLinhas.length} filmes`);

  const progresso = carregarProgresso();
  console.log(`Progresso anterior: ${progresso.size} filmes já processados`);

  const pendentes = todasLinhas.filter(
    (row) => !progresso.has(Number(row.movieId)),
  );
  console.log(`Filmes restantes: ${pendentes.length}\n`);

  let traduzidos = [...progresso.values()].filter((e) => e.translated).length;
  let mantidos = [...progresso.values()].filter((e) => !e.translated).length;

  const inicio = Date.now();

  for (let i = 0; i < pendentes.length; i += BATCH_SIZE) {
    const lote = pendentes.slice(i, i + BATCH_SIZE);

    const resultados = await Promise.all(
      lote.map(async (row) => {
        const resultado = await buscarTituloPtBr(row.title);
        return { row, resultado };
      }),
    );

    const novasEntradas: ProgressEntry[] = [];

    for (const { row, resultado } of resultados) {
      const id = Number(row.movieId);
      const entrada: ProgressEntry = {
        id,
        ptbr: resultado.ptbr,
        translated: resultado.translated,
      };
      novasEntradas.push(entrada);
      progresso.set(id, entrada);

      if (resultado.translated) traduzidos++;
      else mantidos++;
    }

    salvarProgresso(novasEntradas);

    const processados = Math.min(i + BATCH_SIZE, pendentes.length);
    const porcentagem = ((processados / pendentes.length) * 100).toFixed(1);
    const decorrido = ((Date.now() - inicio) / 1000).toFixed(0);
    const velocidade = processados / ((Date.now() - inicio) / 1000);
    const restante = Math.round((pendentes.length - processados) / velocidade);

    process.stdout.write(
      `\r${processados}/${pendentes.length} (${porcentagem}%) | traduzidos: ${traduzidos} | mantidos: ${mantidos} | ~${restante}s restantes`,
    );

    if (i + BATCH_SIZE < pendentes.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log("\n\nTradução concluída. Gerando CSV de saída...");

  // Lê as linhas originais para gerar o CSV de saída
  const cabecalho = Object.keys(todasLinhas[0]!);
  const linhasCabecalho = cabecalho.map(csvEscape).join(",");

  const linhasDados = todasLinhas.map((row) => {
    const id = Number(row.movieId);
    const entrada = progresso.get(id);
    const titulo = entrada?.ptbr ?? row.title;

    return [
      csvEscape(row.movieId),
      csvEscape(titulo),
      ...cabecalho.slice(2).map((col) => csvEscape(row[col] ?? "")),
    ].join(",");
  });

  writeFileSync(OUTPUT_CSV, [linhasCabecalho, ...linhasDados].join("\n") + "\n");

  const totalSegundos = ((Date.now() - inicio) / 1000).toFixed(0);

  console.log(`\nArquivo gerado: ${OUTPUT_CSV}`);
  console.log(`\nEstatísticas:`);
  console.log(`  Traduzidos para PT-BR : ${traduzidos}`);
  console.log(`  Mantidos em inglês    : ${mantidos}`);
  console.log(`  Total                 : ${todasLinhas.length}`);
  console.log(`  Tempo total           : ${totalSegundos}s`);
  console.log(`\nPróximos passos:`);
  console.log(`  1. Revise o arquivo movies-ptbr.csv`);
  console.log(`  2. Substitua movies.csv pelo movies-ptbr.csv`);
  console.log(`  3. Execute: bun run db:reset:full`);

  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("\nErro fatal:", err);
  process.exit(1);
});
