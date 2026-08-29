import type { SearchTimings } from "../types/Search";

/**
 * Painel de comparação de desempenho.
 *
 * Mostra, para a MESMA consulta e na MESMA requisição, quanto custou a
 * varredura sequencial do Postgres e quanto custou o índice em memória.
 *
 * O selo de equivalência é tão importante quanto os tempos: sem ele,
 * seria razoável desconfiar que o caminho novo é mais rápido por
 * devolver menos coisa.
 */

function formatarMs(valor: number | null): string {
  if (valor === null) return "—";
  if (valor < 1) return `${valor.toFixed(3)} ms`;
  return `${valor.toFixed(2)} ms`;
}

export function PerformancePanel({ timings }: { timings: SearchTimings }) {
  const { sqlMs, indexMs, sqlCount, indexCount, identical, onlyIndex } = timings;

  if (sqlMs === null && indexMs === null) return null;

  const ganho =
    sqlMs !== null && indexMs !== null && indexMs > 0 ? sqlMs / indexMs : null;

  // Largura da barra do índice em relação à do SQL. O mínimo de 0,5%
  // existe para a barra não sumir de vez quando o ganho é de 3 ordens
  // de grandeza.
  const larguraIndice =
    ganho !== null ? Math.max(0.5, 100 / ganho) : 100;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Comparação de desempenho
        </h3>

        {identical === true && (
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            {indexCount} resultados idênticos nos dois métodos
          </span>
        )}

        {identical === false && (
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            SQL: {sqlCount} · Índice: {indexCount}
            {onlyIndex !== null && onlyIndex > 0 &&
              ` · ${onlyIndex} só o índice achou`}
          </span>
        )}

        {timings.usedPrefixIndex && (
          <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">
            busca binária por prefixo
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Antes — ILIKE no Postgres
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatarMs(sqlMs)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Seq Scan · 2 colunas varridas
          </p>
        </div>

        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Depois — índice em memória
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatarMs(indexMs)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {timings.usedPrefixIndex
              ? "Vetor ordenado · O(log n)"
              : "Tabela hash · trigramas"}
          </p>
        </div>
      </div>

      {ganho !== null && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-14 text-xs text-zinc-500 dark:text-zinc-400">
              SQL
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-orange-300 dark:bg-orange-700" />
          </div>

          <div className="flex items-center gap-3">
            <span className="w-14 text-xs text-zinc-500 dark:text-zinc-400">
              Índice
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-2.5 rounded-full bg-emerald-500"
                style={{ width: `${larguraIndice}%` }}
              />
            </div>
          </div>

          <p className="pt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {ganho.toFixed(0)}× mais rápido na mesma consulta
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
        Tempos medem apenas a fase de busca por título. O carregamento de
        pôsteres via TMDB fica fora da medição por envolver rede.
      </p>
    </div>
  );
}
