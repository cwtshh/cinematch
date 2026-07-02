import z from "zod";

export const getMoviesToRateQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const submitInitialMovieRatingsBodySchema = z.object({
  ratings: z
    .array(
      z.object({
        movieId: z.string().uuid(),
        rating: z.number().min(0).max(5),
      }),
    )
    .min(0),
});

export type GetMoviesToRateQuery = z.infer<typeof getMoviesToRateQuerySchema>;
export type SubmitInitialMovieRatingsBody = z.infer<
  typeof submitInitialMovieRatingsBodySchema
>;
