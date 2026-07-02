const GENRE_LABELS_PTBR: Record<string, string> = {
  action: "Ação",
  adventure: "Aventura",
  animation: "Animação",
  children: "Infantil",
  comedy: "Comédia",
  crime: "Crime",
  documentary: "Documentário",
  drama: "Drama",
  fantasy: "Fantasia",
  film_noir: "Film Noir",
  horror: "Terror",
  imax: "IMAX",
  musical: "Musical",
  mystery: "Mistério",
  romance: "Romance",
  sci_fi: "Ficção Científica",
  thriller: "Suspense",
  war: "Guerra",
  western: "Faroeste",
};

export function getGenreLabel(slug: string, fallback?: string): string {
  return GENRE_LABELS_PTBR[slug] ?? fallback ?? slug;
}
