import { useState } from "react";
import { Bookmark, Clapperboard, Sparkles, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGenreLabel } from "@/lib/genre-labels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/axios";
import type { RecommendationItem } from "../types/recommendation";

type RecommendedMovieCardProps = {
  movie: RecommendationItem;
  onRate: (feedItemId: string, rating: number) => void;
  onUnrate?: (movieId: string) => void;
  onDismiss?: (movieId: string) => void;
  isSubmittingRating?: boolean;
};

const STAR_VALUES = [1, 2, 3, 4, 5];

export function RecommendedMovieCard({
  movie,
  onRate,
  onUnrate,
  onDismiss,
  isSubmittingRating = false,
}: RecommendedMovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(movie.inWatchlist ?? false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);

  const currentRating = movie.userRating ?? 0;
  const isRated = currentRating > 0;
  const displayTitle = movie.tmdbTitle ?? movie.title;
  const showPoster = Boolean(movie.posterUrl) && !imageError;

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

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    onDismiss?.(movie.id);
  }

  return (
    <>
      {/*
        Wrapper externo é o âncora para os botões flutuantes.
        [perspective] fica num filho para não afetar os botões.
      */}
      <div className="group relative">
        {/* Botão descartar — fora do contexto 3D, sempre visível no hover */}
        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            title="Não tenho interesse"
            className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-zinc-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/80 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Botão watchlist — fora do contexto 3D, sempre visível no hover */}
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

        {/* Card com flip 3D */}
        <div className="[perspective:1000px]">
          <div className="relative aspect-[2/3] w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

            {/* ── FRENTE ─────────────────────────────────────────────── */}
            <div
              className={cn(
                "absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]",
                isRated ? "ring-2 ring-yellow-400" : "ring-1 ring-zinc-200 dark:ring-zinc-800",
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
                {isRated && (
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
                )}
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
                {movie.explanation && (
                  <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-2 py-1">
                    <Sparkles className="h-3 w-3 shrink-0 text-yellow-400/80" />
                    <p className="text-xs italic text-zinc-400">{movie.explanation}</p>
                  </div>
                )}
                {movie.overview ? (
                  <div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
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

              <div>
                <p className="mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  {currentRating > 0 ? `${currentRating} de 5 estrelas` : "Avaliar"}
                </p>
                <div className="flex gap-2">
                  {STAR_VALUES.map((value) => {
                    const isSelected = currentRating >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={isSubmittingRating}
                        onClick={() => currentRating === value ? onUnrate?.(movie.id) : onRate(movie.feedItemId, value)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60",
                          isSelected
                            ? "border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.35)]"
                            : "border-zinc-600 bg-zinc-800/60 text-zinc-500 hover:border-yellow-500/60 hover:text-yellow-400/80",
                        )}
                        aria-label={`Dar nota ${value} para ${displayTitle}`}
                      >
                        <Star className={cn("h-5 w-5", isSelected && "fill-yellow-300 text-yellow-300")} />
                      </button>
                    );
                  })}
                </div>
              </div>
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
                {movie.genres.map((g) => (
                  <span
                    key={g.slug}
                    className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {getGenreLabel(g.slug, g.label)}
                  </span>
                ))}
              </div>
              {movie.explanation && (
                <div className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  <Sparkles className="h-3 w-3 shrink-0 text-yellow-500" />
                  <p className="text-xs italic text-zinc-500 dark:text-zinc-400">{movie.explanation}</p>
                </div>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">{movie.overview}</p>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {currentRating > 0 ? `${currentRating} de 5 estrelas` : "Avaliar"}
              </p>
              <button
                type="button"
                onClick={handleToggleWatchlist}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors",
                  inWatchlist
                    ? "text-yellow-500 hover:text-yellow-600"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                <Bookmark className={cn("h-3.5 w-3.5", inWatchlist && "fill-yellow-500")} />
                {inWatchlist ? "Na lista" : "Salvar"}
              </button>
            </div>
            <div className="flex gap-2">
              {STAR_VALUES.map((value) => {
                const isSelected = currentRating >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isSubmittingRating}
                    onClick={() => { currentRating === value ? onUnrate?.(movie.id) : onRate(movie.feedItemId, value); setDialogOpen(false); }}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-150 disabled:opacity-60",
                      isSelected
                        ? "border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.35)]"
                        : "border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-yellow-400/60 hover:text-yellow-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-yellow-500/60 dark:hover:text-yellow-400",
                    )}
                  >
                    <Star className={cn("h-5 w-5", isSelected && "fill-yellow-300 text-yellow-300")} />
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
