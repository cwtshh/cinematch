import { describe, expect, it } from "vitest";
import { genres, eras, popularityOptions } from "@/app/features/on-board/types/OnBoardingTypes";

describe("genres", () => {
  it("contém exatamente 19 gêneros", () => {
    expect(genres).toHaveLength(19);
  });

  it("cada gênero tem slug, label e ícone definidos", () => {
    for (const genero of genres) {
      expect(typeof genero.slug).toBe("string");
      expect(genero.slug.length).toBeGreaterThan(0);
      expect(typeof genero.label).toBe("string");
      expect(genero.label.length).toBeGreaterThan(0);
      expect(genero.icon).toBeTruthy();
    }
  });

  it("não possui slugs duplicados", () => {
    const slugs = genres.map((g) => g.slug);
    const unicos = new Set(slugs);
    expect(unicos.size).toBe(slugs.length);
  });

  it("não possui labels duplicados", () => {
    const labels = genres.map((g) => g.label);
    const unicos = new Set(labels);
    expect(unicos.size).toBe(labels.length);
  });

  it("contém todos os slugs esperados", () => {
    const slugs = genres.map((g) => g.slug);
    const esperados = [
      "action", "adventure", "animation", "children", "comedy",
      "crime", "documentary", "drama", "fantasy", "film_noir",
      "horror", "musical", "mystery", "romance", "sci_fi",
      "thriller", "war", "western", "imax",
    ];
    for (const slug of esperados) {
      expect(slugs).toContain(slug);
    }
  });
});

describe("eras", () => {
  it("contém exatamente 4 opções", () => {
    expect(eras).toHaveLength(4);
  });

  it("tem 'any' como primeira opção", () => {
    expect(eras[0].id).toBe("any");
  });

  it("os identificadores correspondem ao esquema do servidor", () => {
    const validos = ["any", "before-1980", "80s-90s", "2000-plus"];
    for (const era of eras) {
      expect(validos).toContain(era.id);
    }
  });

  it("cada opção tem id e label", () => {
    for (const era of eras) {
      expect(typeof era.id).toBe("string");
      expect(typeof era.label).toBe("string");
      expect(era.label.length).toBeGreaterThan(0);
    }
  });
});

describe("popularityOptions", () => {
  it("contém exatamente 3 opções", () => {
    expect(popularityOptions).toHaveLength(3);
  });

  it("os identificadores correspondem ao esquema do servidor", () => {
    const validos = ["any", "popular", "hidden-gems"];
    for (const opcao of popularityOptions) {
      expect(validos).toContain(opcao.id);
    }
  });

  it("cada opção tem label e descrição preenchidos", () => {
    for (const opcao of popularityOptions) {
      expect(typeof opcao.label).toBe("string");
      expect(opcao.label.length).toBeGreaterThan(0);
      expect(typeof opcao.description).toBe("string");
      expect(opcao.description.length).toBeGreaterThan(0);
    }
  });
});
