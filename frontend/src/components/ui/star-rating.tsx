import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  rating: number | null;
  onRate: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function StarRating({ rating, onRate, disabled = false, size = "sm" }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const active = hovered ?? rating ?? 0;
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = active >= value;
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onRate(value)}
            onMouseEnter={() => !disabled && setHovered(value)}
            onMouseLeave={() => !disabled && setHovered(null)}
            className={cn(
              "flex items-center justify-center rounded transition-transform",
              btnClass,
              disabled ? "cursor-default" : "cursor-pointer hover:scale-110",
            )}
            aria-label={`Avaliar ${value} estrela${value > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                iconClass,
                "transition-colors",
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-zinc-300 dark:text-zinc-600",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
