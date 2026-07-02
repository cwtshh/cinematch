import { useState } from "react";
import { Ban, Bookmark, Clapperboard, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGenreLabel } from "@/lib/genre-labels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rateMovie } from "@/lib/rate-movie";
import { apiClient } from "@/lib/axios";
import { calcNewRating } from "@/lib/rating-toggle";
import type { HistoryItem } from "../types/history";

type HistoryMovieCardProps = {
  movie: HistoryItem;
  index?: number;
  allowUnrate?: boolean;
  onRated?: (movieId: string, rating: number | null) => void;
};

const STAR_VALUES = [1, 2, 3, 4, 5];

export function HistoryMovieCard({ movie, index = 0, allowUnrate = true, onRated }: HistoryMovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [rating, setRating] = useState<number | null>(movie.userRating);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(movie.inWatchlist ?? false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);

  const displayTitle = movie.tmdbTitle ?? movie.title;
  const currentRating = rating ?? 0;
  const isRated = currentRating > 0;
  const isDismissed = movie.status === "dismissed";
  const showPoster = Boolean(movie.posterUrl) && !imageError;
  const animationDelay = `${Math.min(index, 8) * 40}ms`;

  async function handleRate(value: number) {
    if (isSaving || isDismissed) return;
    setIsSaving(true);
    const newRating = calcNewRating(rating, value, allowUnrate);
    const prev = rating;
    setRating(newRating);
    try {
      if (newRating !== null) {
        await rateMovie(movie.id, newRating);
      } else {
        await apiClient.delete(`/movies/${movie.id}/rate`);
      }
      onRated?.(movie.id, newRating);
    } catch {
      setRating(prev);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleWatchlist(e: React.MouseEvent) {
    e.stopPropagation();
    if (isTogglingWatchlist) return;
    setIsTogglingWatchlist(true);
    const next = !inWatchlist;
    setInWatchlist(next);
    try {
      if (next) {
        await apiClient.post(`/watchlist/${movie.id}`);
      } else {
        await apiClient.delete(`/watchlist/${movie.id}`);
      }
    } catch {
      setInWatchlist(!next);
    } finally {
      setIsTogglingWatchlist(false);
    }
  }

  return (
    <>
      {/* Wrapper externo: âncora para posicionamento dos botões flutuantes */}
      <div
        style={{ animationDelay, animationFillMode: "both" }}
        className="group animate-in fade-in slide-in-from-bottom-3 relative"
      >
        {/* Bookmark fora do contexto 3D — sempre clicável no hover */}
        <button
          type="button"
          onClick={handleToggleWatchlist}
          title={inWatchlist ? "Remover da lista" : "Adicionar à lista"}
          className={cn(
            "absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 transition-all duration-200 group-hover:opacity-100 hover:bg-black/80",
            inWatchlist
              ? "text-yellow-400 opacity-100"
              : "text-zinc-400 opacity-0 hover:text-white",
          )}
        >
          <Bookmark className={cn("h-3.5 w-3.5", inWatchlist && "fill-yellow-400")} />
        </button>

        {/* Perspectiva como filho, não como wrapper dos botões */}
        <div className="[perspective:1000px]">
          <div className="relative aspect-[2/3] w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

            {/* ── FRENTE ─────────────────────────────────────────────── */}
            <div
              className={cn(
                "absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]",
                isDismissed
                  ? "ring-1 ring-zinc-700 opacity-60"
                  : isRated
                  ? "ring-2 ring-yellow-400"
                  : "ring-1 ring-zinc-200 dark:ring-zinc-800",
              )}
            >
              {showPoster ? (
                <img
                  src={movie.posterUrl ?? undefined}
                  alt={`Poster de ${displayTitle}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-100 px-4 text-center dark:bg-zinc-800">
                  <Clapperboard className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                  {displayTitle}
                </p>
                {movie.releaseYear && (
                  <p className="mt-0.5 text-xs text-zinc-400">{movie.releaseYear}</p>
                )}
                {isDismissed ? (
                  <div className="mt-1.5 flex items-center gap-1 text-zinc-500">
                    <Ban className="h-3 w-3" />
                    <span className="text-xs">Descartado</span>
                  </div>
                ) : isRated ? (
                  <div className="mt-1.5 flex items-center gap-0.5">
                    {STAR_VALUES.map((v) => (
                      <Star
                        key={v}
                        className={cn(
                          "h-3 w-3",
                          v <= currentRating ? "fill-yellow-400 text-yellow-400" : "text-zinc-600",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── VERSO ──────────────────────────────────────────────── */}
            <div className="absolute inset-0 flex flex-col gap-3 overflow-hidden rounded-2xl bg-zinc-900 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ring-1 ring-zinc-700">
              <div className="min-h-0 flex-1 overflow-hidden">
                <p className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-white">
                  {displayTitle}
                </p>
                {movie.genres.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {movie.genres.slice(0, 3).map((g) => (
                      <span
                        key={g.slug}
                        className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                      >
                        {getGenreLabel(g.slug, g.label)}
                      </span>
                    ))}
                  </div>
                )}
                {movie.overview ? (
                  <div>
                    <p className="line-clamp-4 text-xs leading-relaxed text-zinc-400">
                      {movie.overview}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDialogOpen(true)}
                      className="mt-1 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                    >
                      Ver mais
                    </button>
                  </div>
                ) : (
                  <p className="text-xs italic text-zinc-600">Sinopse não disponível.</p>
                )}
              </div>

              {isDismissed ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 px-3 py-2">
                  <Ban className="h-3.5 w-3.5 text-zinc-600" />
                  <p className="text-xs text-zinc-600">
                    Descartado — não influencia as recomendações
                  </p>
                </div>
              ) : (
                <div>
                  <p className="mb-1.5 text-xs text-zinc-500">
                    {currentRating > 0 ? `Nota: ${currentRating}/5` : "Sua nota"}
                  </p>
                  <div className="flex gap-1.5">
                    {STAR_VALUES.map((value) => {
                      const isSelected = currentRating >= value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleRate(value)}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-60",
                            isSelected
                              ? "border-yellow-500 bg-yellow-500/15 text-yellow-400"
                              : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300",
                          )}
                          aria-label={`Dar nota ${value} para ${displayTitle}`}
                        >
                          <Star className={cn("h-4 w-4", isSelected && "fill-yellow-400 text-yellow-400")} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="leading-snug">{displayTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            {showPoster && (
              <img
                src={movie.posterUrl ?? undefined}
                alt={displayTitle}
                className="h-40 w-28 flex-shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {movie.releaseYear && (
                  <span className="text-sm text-muted-foreground">{movie.releaseYear}</span>
                )}
                {isDismissed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                    <Ban className="h-3 w-3" /> Descartado
                  </span>
                )}
                {movie.genres.map((g) => (
                  <span
                    key={g.slug}
                    className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {getGenreLabel(g.slug, g.label)}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{movie.overview}</p>
            </div>
          </div>
          {!isDismissed && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium">
                {currentRating > 0 ? `Sua nota: ${currentRating}/5` : "Dar nota"}
              </p>
              <div className="flex gap-2">
                {STAR_VALUES.map((value) => {
                  const isSelected = currentRating >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isSaving}
                      onClick={() => { handleRate(value); setDialogOpen(false); }}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-60",
                        isSelected
                          ? "border-yellow-500 bg-yellow-500/15 text-yellow-400"
                          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Star className={cn("h-4.5 w-4.5", isSelected && "fill-yellow-400 text-yellow-400")} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
