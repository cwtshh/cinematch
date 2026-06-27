import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationItem } from "../types/recommendation";

type RecommendedMovieCardProps = {
  movie: RecommendationItem;
  onRate: (feedItemId: string, rating: number) => void;
  isSubmittingRating?: boolean;
};

const STAR_VALUES = [1, 2, 3, 4, 5];

export function RecommendedMovieCard({
  movie,
  onRate,
  isSubmittingRating = false,
}: RecommendedMovieCardProps) {
  const currentRating = movie.userRating ?? 0;
  const [imageError, setImageError] = useState(false);

  const showPoster = Boolean(movie.posterUrl) && !imageError;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-2/3 bg-zinc-100 dark:bg-zinc-800">
        {showPoster ? (
          <img
            src={movie.posterUrl ?? undefined}
            alt={`Poster de ${movie.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100 px-4 text-center dark:bg-zinc-800">
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

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {movie.title}
          </h3>

          <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {movie.releaseYear && <span>{movie.releaseYear}</span>}
            {movie.popularityBucket && <span>• {movie.popularityBucket}</span>}
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
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

        <div className="space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sua nota:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {currentRating > 0 ? `${currentRating}/5` : "não avaliado"}
            </span>
          </p>

          <div className="flex flex-wrap gap-2">
            {STAR_VALUES.map((value) => {
              const isSelected = currentRating >= value;

              return (
                <button
                  key={value}
                  type="button"
                  disabled={isSubmittingRating}
                  onClick={() => onRate(movie.feedItemId, value)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    isSelected
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-400"
                      : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  )}
                  aria-label={`Dar nota ${value} para ${movie.title}`}
                >
                  <Star
                    className={cn(
                      "h-4.5 w-4.5",
                      isSelected && "fill-yellow-400 text-yellow-400",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
