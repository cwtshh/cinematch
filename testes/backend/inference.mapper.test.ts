import { describe, expect, test } from "bun:test";
import { mapEraToInference, mapPopularityToInference } from "@/services/ai-inference-service/inference.mapper";

describe("mapEraToInference", () => {
  test("retorna null para 'any'", () => {
    expect(mapEraToInference("any")).toBeNull();
  });

  test("retorna null para undefined", () => {
    expect(mapEraToInference(undefined)).toBeNull();
  });

  test("retorna null para null", () => {
    expect(mapEraToInference(null)).toBeNull();
  });

  test("mapeia 'before-1980' para 'antigos'", () => {
    expect(mapEraToInference("before-1980")).toBe("antigos");
  });

  test("mapeia '80s-90s' para '80_90'", () => {
    expect(mapEraToInference("80s-90s")).toBe("80_90");
  });

  test("mapeia '2000-plus' para 'recentes'", () => {
    expect(mapEraToInference("2000-plus")).toBe("recentes");
  });

  test("valores internos do serviço de IA passam direto", () => {
    expect(mapEraToInference("antigos")).toBe("antigos");
    expect(mapEraToInference("80_90")).toBe("80_90");
    expect(mapEraToInference("recentes")).toBe("recentes");
  });

  test("valores legados ou inválidos retornam null", () => {
    expect(mapEraToInference("old")).toBeNull();
    expect(mapEraToInference("recent")).toBeNull();
    expect(mapEraToInference("qualquer")).toBeNull();
  });
});

describe("mapPopularityToInference", () => {
  test("retorna null para 'any'", () => {
    expect(mapPopularityToInference("any")).toBeNull();
  });

  test("retorna null para undefined", () => {
    expect(mapPopularityToInference(undefined)).toBeNull();
  });

  test("retorna null para null", () => {
    expect(mapPopularityToInference(null)).toBeNull();
  });

  test("mapeia 'popular' para 'populares'", () => {
    expect(mapPopularityToInference("popular")).toBe("populares");
  });

  test("mapeia 'hidden-gems' para 'nicho'", () => {
    expect(mapPopularityToInference("hidden-gems")).toBe("nicho");
  });

  test("valores internos do serviço de IA passam direto", () => {
    expect(mapPopularityToInference("populares")).toBe("populares");
    expect(mapPopularityToInference("nicho")).toBe("nicho");
  });

  test("valores inválidos retornam null", () => {
    expect(mapPopularityToInference("mainstream")).toBeNull();
    expect(mapPopularityToInference("qualquer")).toBeNull();
  });
});
