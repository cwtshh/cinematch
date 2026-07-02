import { useEffect, useState } from "react";
import { Bookmark, Clapperboard, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGenreLabel } from "@/lib/genre-labels";
import { rateMovie } from "@/lib/rate-movie";
import { apiClient } from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WatchlistItem = {
  id: string;
  title: string;
  tmdbTitle: string | null;
  overview: string | null;
  releaseYear: number | null;
  popularityBucket: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  addedAt: string;
  genres: { slug: string; label: string }[];
  userRating: number | null;
  inWatchlist: boolean;
};

type WatchlistResponse = { items: WatchlistItem[] };

const STAR_VALUES = [1, 2, 3, 4, 5];

function WatchlistCard({ item, onRemove }: { item: WatchlistItem; onRemove: (id: string) => void }) {
  const [imageError, setImageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [rating, setRating] = useState<number | null>(item.userRating);
  const [isSaving, setIsSaving] = useState(false);

  const displayTitle = item.tmdbTitle ?? item.title;
  const showPoster = Boolean(item.posterUrl) && !imageError;
  const currentRating = rating ?? 0;
  const isRated = currentRating > 0;

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (isRemoving) return;
    setIsRemoving(true);
    try {
      await apiClient.delete(`/watchlist/${item.id}`);
      onRemove(item.id);
    } catch {
      setIsRemoving(false);
    }
  }

  async function handleRate(value: number) {
    if (isSaving) return;
    setIsSaving(true);
    const newRating = rating === value ? null : value;
    const prev = rating;
    setRating(newRating);
    try {
      if (newRating !== null) {
        await rateMovie(item.id, newRating);
      } else {
        await apiClient.delete(`/movies/${item.id}/rate`);
      }
    } catch {
      setRating(prev);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {/* Wrapper externo: âncora para posicionamento dos botões flutuantes */}
      <div className="group relative">
        {/* Bookmark fora do contexto 3D — sempre clicável no hover */}
        <button
          type="button"
          onClick={handleRemove}
          title="Remover da lista"
          disabled={isRemoving}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-yellow-400 opacity-100 transition-all hover:bg-black/80 hover:text-red-400 disabled:opacity-60"
        >
          <Bookmark className="h-3.5 w-3.5 fill-yellow-400" />
        </button>

        {/* Perspectiva como filho, não como wrapper dos botões */}
        <div className="[perspective:1000px]">
          <div className="relative aspect-[2/3] w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
            {/* FRENTE */}
            <div
              className={cn(
                "absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]",
                isRated ? "ring-2 ring-yellow-400" : "ring-1 ring-zinc-200 dark:ring-zinc-800",
              )}
            >
              {showPoster ? (
                <img
                  src={item.posterUrl ?? undefined}
                  alt={displayTitle}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                  <Clapperboard className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{displayTitle}</p>
                {item.releaseYear && (
                  <p className="mt-0.5 text-xs text-zinc-400">{item.releaseYear}</p>
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

            {/* VERSO */}
            <div className="absolute inset-0 flex flex-col gap-3 overflow-hidden rounded-2xl bg-zinc-900 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ring-1 ring-zinc-700">
              <div className="min-h-0 flex-1 overflow-hidden">
                <p className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-white">{displayTitle}</p>
                {item.genres.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {item.genres.slice(0, 3).map((g) => (
                      <span key={g.slug} className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {getGenreLabel(g.slug, g.label)}
                      </span>
                    ))}
                  </div>
                )}
                {item.overview ? (
                  <div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">{item.overview}</p>
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

              <button
                type="button"
                onClick={handleRemove}
                disabled={isRemoving}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover da lista
              </button>
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
              <img src={item.posterUrl ?? undefined} alt={displayTitle} className="h-40 w-28 flex-shrink-0 rounded-xl object-cover" />
            )}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {item.releaseYear && <span className="text-sm text-muted-foreground">{item.releaseYear}</span>}
                {item.genres.map((g) => (
                  <span key={g.slug} className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {getGenreLabel(g.slug, g.label)}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.overview}</p>
            </div>
          </div>
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
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await apiClient.get<WatchlistResponse>("/watchlist");
        setItems(data.items);
      } catch {
        setError("Não foi possível carregar sua lista.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function handleRemove(movieId: string) {
    setItems((curr) => curr.filter((m) => m.id !== movieId));
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Minha Lista
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Filmes que você quer assistir mais tarde.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <Bookmark className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="text-base font-medium text-zinc-500">Sua lista está vazia.</p>
          <p className="text-sm text-zinc-400">
            Passe o mouse sobre um filme e clique no marcador para salvá-lo aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <WatchlistCard key={item.id} item={item} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
