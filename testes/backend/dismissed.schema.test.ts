import { describe, expect, test } from "bun:test";
import { dismissedParamsSchema } from "@/modules/dismissed/dismissed.schema";

describe("dismissedParamsSchema", () => {
  test("aceita UUID v4 válido", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(dismissedParamsSchema.safeParse({ movieId: uuid }).success).toBe(true);
  });

  test("rejeita string vazia", () => {
    expect(dismissedParamsSchema.safeParse({ movieId: "" }).success).toBe(false);
  });

  test("rejeita string não-UUID", () => {
    expect(dismissedParamsSchema.safeParse({ movieId: "filme-123" }).success).toBe(false);
  });

  test("rejeita movieId ausente", () => {
    expect(dismissedParamsSchema.safeParse({}).success).toBe(false);
  });
});
