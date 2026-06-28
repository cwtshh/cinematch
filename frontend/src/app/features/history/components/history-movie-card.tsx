import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "../types/history";

type HistoryMovieCardProps = {
  movie: HistoryItem;
  index?: number;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function HistoryMovieCard({ movie, index = 0 }: HistoryMovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const showPoster = Boolean(movie.posterUrl) && !imageError;

  // limita o atraso pra que listas longas não fiquem entrando "eternamente"
  const animationDelay = `${Math.min(index, 8) * 40}ms`;

  return (
    <div
      style={{ animationDelay, animationFillMode: "both" }}
      className="group animate-in fade-in slide-in-from-bottom-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:shadow-black/30"
    >
      <div className="relative aspect-2/3 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {showPoster ? (
          <img
            src={movie.posterUrl ?? undefined}
            alt={`Poster de ${movie.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center">
            <div className="space-y-2">
              <p className="line-clamp-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {movie.title}
              </p>
              {movie.releaseYear && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {movie.releaseYear}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {movie.title}
          </h3>

          <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {movie.releaseYear && <span>{movie.releaseYear}</span>}
            {movie.popularityBucket && <span>• {movie.popularityBucket}</span>}
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre.slug}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {genre.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {movie.status === "rated" && movie.userRating !== null ? (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={cn(
                    "h-4 w-4",
                    (movie.userRating ?? 0) >= value
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-zinc-300 dark:text-zinc-600",
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {movie.userRating}/5
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Não avaliado
          </p>
        )}

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {movie.status === "rated" && movie.ratedAt
            ? `Avaliado em ${formatDate(movie.ratedAt)}`
            : `Recebido em ${formatDate(movie.accessedAt)}`}
        </p>
      </div>
    </div>
  );
}
