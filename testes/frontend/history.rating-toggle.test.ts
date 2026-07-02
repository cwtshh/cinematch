import { describe, expect, it } from "vitest";
import { calcNewRating } from "@/lib/rating-toggle";

describe("calcNewRating", () => {
  describe("allowUnrate = true (comportamento de Acessados)", () => {
    it("clicar na mesma estrela da nota atual desavalia (retorna null)", () => {
      expect(calcNewRating(4, 4, true)).toBeNull();
    });

    it("clicar em estrela diferente da nota atual muda a nota", () => {
      expect(calcNewRating(3, 5, true)).toBe(5);
      expect(calcNewRating(5, 1, true)).toBe(1);
    });

    it("clicar em qualquer estrela sem nota prévia define a nota", () => {
      expect(calcNewRating(null, 3, true)).toBe(3);
    });

    it("todas as notas de 1 a 5 são aceitas como valor novo", () => {
      for (const v of [1, 2, 3, 4, 5]) {
        expect(calcNewRating(null, v, true)).toBe(v);
      }
    });
  });

  describe("allowUnrate = false (comportamento de Avaliados)", () => {
    it("clicar na mesma estrela da nota atual NÃO desavalia — mantém a nota", () => {
      expect(calcNewRating(4, 4, false)).toBe(4);
    });

    it("clicar em estrela diferente muda a nota normalmente", () => {
      expect(calcNewRating(2, 5, false)).toBe(5);
    });

    it("clicar em qualquer estrela sem nota prévia define a nota", () => {
      expect(calcNewRating(null, 2, false)).toBe(2);
    });
  });
});
