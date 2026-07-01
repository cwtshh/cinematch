import type { ComponentType } from "react";
import {
  Baby,
  BookOpen,
  Clapperboard,
  Compass,
  Fingerprint,
  Flame,
  Heart,
  Laugh,
  Moon,
  Mountain,
  Music,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Swords,
  Wand2,
  Zap,
  Maximize2,
} from "lucide-react";

export type GenreOption = {
  slug: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const genres: GenreOption[] = [
  { slug: "action", label: "Ação", icon: Swords },
  { slug: "adventure", label: "Aventura", icon: Compass },
  { slug: "animation", label: "Animação", icon: Sparkles },
  { slug: "children", label: "Infantil", icon: Baby },
  { slug: "comedy", label: "Comédia", icon: Laugh },
  { slug: "crime", label: "Crime", icon: Fingerprint },
  { slug: "documentary", label: "Documentário", icon: BookOpen },
  { slug: "drama", label: "Drama", icon: Clapperboard },
  { slug: "fantasy", label: "Fantasia", icon: Wand2 },
  { slug: "film_noir", label: "Film Noir", icon: Moon },
  { slug: "horror", label: "Terror", icon: ShieldAlert },
  { slug: "musical", label: "Musical", icon: Music },
  { slug: "mystery", label: "Mistério", icon: Search },
  { slug: "romance", label: "Romance", icon: Heart },
  { slug: "sci_fi", label: "Ficção Científica", icon: Rocket },
  { slug: "thriller", label: "Thriller", icon: Zap },
  { slug: "war", label: "Guerra", icon: Flame },
  { slug: "western", label: "Faroeste", icon: Mountain },
  { slug: "imax", label: "IMAX", icon: Maximize2 },
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
