import { z } from "zod";

export const generateRecommendationsBodySchema = z.object({
  nRecommendations: z.number().int().min(1).max(50).optional(),
});

export type GenerateRecommendationsBody = z.infer<
  typeof generateRecommendationsBodySchema
>;
