import { useState } from "react";
import type { SearchMovieItem } from "../types/Search";

type MovieCardProps = {
  movie: SearchMovieItem;
};

export function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const showPoster = Boolean(movie.posterUrl) && !imageError;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:border-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/50">
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
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {movie.title}
        </h3>

        <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {movie.releaseYear && <span>{movie.releaseYear}</span>}
          {movie.popularityBucket && <span>• {movie.popularityBucket}</span>}
        </div>
      </div>
    </div>
  );
}