import { describe, expect, test } from "bun:test";
import { movieParamsSchema, rateMovieBodySchema } from "@/modules/movies/movies.schema";

describe("rateMovieBodySchema", () => {
  test("aceita notas inteiras de 1 a 5", () => {
    for (const nota of [1, 2, 3, 4, 5]) {
      expect(rateMovieBodySchema.safeParse({ rating: nota }).success).toBe(true);
    }
  });

  test("rejeita nota 0", () => {
    expect(rateMovieBodySchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  test("rejeita nota 6", () => {
    expect(rateMovieBodySchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  test("rejeita nota negativa", () => {
    expect(rateMovieBodySchema.safeParse({ rating: -1 }).success).toBe(false);
  });

  test("rejeita nota decimal", () => {
    expect(rateMovieBodySchema.safeParse({ rating: 3.5 }).success).toBe(false);
  });

  test("rejeita nota como string", () => {
    expect(rateMovieBodySchema.safeParse({ rating: "4" }).success).toBe(false);
  });

  test("rejeita corpo sem campo rating", () => {
    expect(rateMovieBodySchema.safeParse({}).success).toBe(false);
  });

  test("rejeita rating null", () => {
    expect(rateMovieBodySchema.safeParse({ rating: null }).success).toBe(false);
  });
});

describe("movieParamsSchema", () => {
  test("aceita UUID v4 válido", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(movieParamsSchema.safeParse({ movieId: uuid }).success).toBe(true);
  });

  test("rejeita string vazia", () => {
    expect(movieParamsSchema.safeParse({ movieId: "" }).success).toBe(false);
  });

  test("rejeita string não-UUID", () => {
    expect(movieParamsSchema.safeParse({ movieId: "abc123" }).success).toBe(false);
  });

  test("rejeita movieId ausente", () => {
    expect(movieParamsSchema.safeParse({}).success).toBe(false);
  });

  test("rejeita número no lugar do UUID", () => {
    expect(movieParamsSchema.safeParse({ movieId: 123 }).success).toBe(false);
  });
});
