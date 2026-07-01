import { describe, expect, test } from "bun:test";
import { saveOnBoardingPreferencesBodySchema } from "@/modules/on-boarding/http/on-boarding.schema";

describe("saveOnBoardingPreferencesBodySchema", () => {
  describe("campo genres", () => {
    test("aceita lista de slugs válida", () => {
      const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
        genres: ["action", "drama"],
        era: "any",
        popularity: "any",
      });
      expect(resultado.success).toBe(true);
    });

    test("rejeita lista vazia de gêneros", () => {
      const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
        genres: [],
        era: "any",
        popularity: "any",
      });
      expect(resultado.success).toBe(false);
    });

    test("rejeita gênero com string vazia", () => {
      const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
        genres: [""],
        era: "any",
        popularity: "any",
      });
      expect(resultado.success).toBe(false);
    });

    test("aceita slug com underline (ex: film_noir, sci_fi)", () => {
      const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
        genres: ["film_noir", "sci_fi"],
        era: "any",
        popularity: "any",
      });
      expect(resultado.success).toBe(true);
    });
  });

  describe("campo era", () => {
    test("aceita todos os valores válidos", () => {
      const eras = ["any", "before-1980", "80s-90s", "2000-plus"] as const;
      for (const era of eras) {
        const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
          genres: ["action"],
          era,
          popularity: "any",
        });
        expect(resultado.success).toBe(true);
      }
    });

    test("rejeita os valores do formato antigo", () => {
      for (const eraInvalida of ["old", "80_90", "recent"]) {
        const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
          genres: ["action"],
          era: eraInvalida,
          popularity: "any",
        });
        expect(resultado.success).toBe(false);
      }
    });

    test("rejeita era indefinida", () => {
      const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
        genres: ["action"],
        era: "indefinida",
        popularity: "any",
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("campo popularity", () => {
    test("aceita todos os valores válidos", () => {
      const opcoes = ["any", "popular", "hidden-gems"] as const;
      for (const popularity of opcoes) {
        const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
          genres: ["action"],
          era: "any",
          popularity,
        });
        expect(resultado.success).toBe(true);
      }
    });

    test("rejeita popularidade inválida", () => {
      const resultado = saveOnBoardingPreferencesBodySchema.safeParse({
        genres: ["action"],
        era: "any",
        popularity: "mainstream",
      });
      expect(resultado.success).toBe(false);
    });
  });
});
