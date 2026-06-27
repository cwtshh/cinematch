export function mapEraToInference(
  era: string | null | undefined,
): "antigos" | "80_90" | "recentes" | null {
  if (!era || era === "any") return null;
  if (era === "before-1980") return "antigos";
  if (era === "80s-90s") return "80_90";
  if (era === "2000-plus") return "recentes";

  if (era === "antigos" || era === "80_90" || era === "recentes") {
    return era;
  }

  return null;
}

export function mapPopularityToInference(
  popularity: string | null | undefined,
): "populares" | "nicho" | null {
  if (!popularity || popularity === "any") return null;
  if (popularity === "popular") return "populares";
  if (popularity === "hidden-gems") return "nicho";

  if (popularity === "populares" || popularity === "nicho") {
    return popularity;
  }

  return null;
}
