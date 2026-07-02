import { z } from "zod";

export const dismissedParamsSchema = z.object({
  movieId: z.string().uuid(),
});
