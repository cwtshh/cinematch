import type { ComponentType } from "react";
import {
  Clapperboard,
  Heart,
  Laugh,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Swords,
} from "lucide-react";

export type GenreOption = {
  slug: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const genres: GenreOption[] = [
  { slug: "drama", label: "Drama", icon: Clapperboard },
  { slug: "comedy", label: "Comédia", icon: Laugh },
  { slug: "horror", label: "Terror", icon: ShieldAlert },
  { slug: "sci_fi", label: "Ficção Científica", icon: Rocket },
  { slug: "romance", label: "Romance", icon: Heart },
  { slug: "action", label: "Ação", icon: Swords },
  { slug: "mystery", label: "Mistério", icon: Search },
  { slug: "animation", label: "Animação", icon: Sparkles },
];

export const eras = [
  { id: "any", label: "Qualquer época" },
  { id: "before-1980", label: "Antes de 1980" },
  { id: "80s-90s", label: "Anos 80/90" },
  { id: "2000-plus", label: "Anos 2000+" },
] as const;

export const popularityOptions = [
  {
    id: "any",
    label: "Qualquer",
    description: "Mistura filmes conhecidos e descobertas menos óbvias.",
  },
  {
    id: "popular",
    label: "Populares",
    description: "Prioriza títulos mais vistos e com maior reconhecimento.",
  },
  {
    id: "hidden-gems",
    label: "Menos conhecidos",
    description: "Favorece descobertas fora do radar e joias escondidas.",
  },
] as const;
