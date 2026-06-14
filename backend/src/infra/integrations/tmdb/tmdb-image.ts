export function buildTmdbPosterUrl(
  posterPath: string | null,
  size: "w185" | "w342" | "w500" | "w780" | "original" = "w500",
) {
  if (!posterPath) return null;

  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}
