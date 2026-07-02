import { z } from "zod";

export const movieParamsSchema = z.object({
  movieId: z.string().uuid(),
});

export const rateMovieBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
});
