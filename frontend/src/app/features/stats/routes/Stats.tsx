import { useEffect, useState } from "react";
import { BarChart3, Bookmark, Star, TrendingUp, XCircle } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { getGenreLabel } from "@/lib/genre-labels";
import { cn } from "@/lib/utils";

type StatsResponse = {
  totalRated: number;
  avgRating: number | null;
  ratingDistribution: Record<string, number>;
  topGenres: { slug: string; label: string; count: number; avgRating: number | null }[];
  eraStats: { era: string; count: number; avgRating: number | null }[];
  watchlistCount: number;
  dismissedCount: number;
};

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accent ?? "bg-zinc-100 dark:bg-zinc-800")}>
        <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await apiClient.get<StatsResponse>("/stats");
        setStats(data);
      } catch {
        setError("Não foi possível carregar suas estatísticas.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-4xl flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-zinc-500">{error ?? "Sem dados."}</p>
      </div>
    );
  }

  const maxDist = Math.max(...Object.values(stats.ratingDistribution), 1);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Estatísticas
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Um resumo do seu gosto cinematográfico.
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Filmes avaliados" value={stats.totalRated} icon={Star} />
        <StatCard
          label="Nota média"
          value={stats.avgRating !== null ? `${stats.avgRating}/5` : "—"}
          icon={TrendingUp}
        />
        <StatCard label="Na lista" value={stats.watchlistCount} icon={Bookmark} />
        <StatCard label="Descartados" value={stats.dismissedCount} icon={XCircle} />
      </div>

      {/* Distribuição de notas */}
      {stats.totalRated > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Distribuição de notas
          </h2>
          <div className="flex flex-col gap-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingDistribution[star] ?? 0;
              const pct = maxDist > 0 ? (count / maxDist) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex w-16 items-center justify-end gap-1 shrink-0">
                    <span className="text-sm text-zinc-500">{star}</span>
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-3 rounded-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-zinc-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Top gêneros */}
        {stats.topGenres.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Gêneros favoritos
            </h2>
            <div className="flex flex-col gap-3">
              {stats.topGenres.map((g, i) => (
                <div key={g.slug} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-zinc-400">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getGenreLabel(g.slug, g.label)}</p>
                    <p className="text-xs text-zinc-500">
                      {g.count} {g.count === 1 ? "filme" : "filmes"}
                      {g.avgRating !== null && ` · média ${g.avgRating}`}
                    </p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-zinc-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Épocas */}
        {stats.eraStats.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Por época
            </h2>
            <div className="flex flex-col gap-3">
              {stats.eraStats
                .sort((a, b) => b.count - a.count)
                .map((e) => (
                  <div key={e.era} className="flex items-center justify-between gap-3">
                    <p className="text-sm">{e.era}</p>
                    <div className="text-right">
                      <p className="text-sm font-medium">{e.count} {e.count === 1 ? "filme" : "filmes"}</p>
                      {e.avgRating !== null && (
                        <p className="text-xs text-zinc-500">média {e.avgRating}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
