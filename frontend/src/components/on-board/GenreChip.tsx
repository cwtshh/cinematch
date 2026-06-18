import { cn } from "@/lib/utils";

type GenreChipProps = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  onClick: () => void;
};

export function GenreChip({ label, Icon, selected, onClick }: GenreChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
          : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-black/10" : "bg-muted text-primary",
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>

      <span className="text-sm font-medium leading-5">{label}</span>
    </button>
  );
}
