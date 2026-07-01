import { z } from "zod";

export const getActiveRecommendationsResponseSchema = z.object({
  feed: z.object({
    id: z.uuid(),
    userId: z.string(),
    version: z.number(),
    status: z.enum(["active", "archived"]),
    generatedAt: z.date(),
    context: z
      .object({
        source: z.enum(["initial-rating", "refresh", "manual"]),
        ratingsCount: z.number(),
        genres: z.array(z.string()),
        era: z.string().nullable(),
        popularity: z.string().nullable(),
      })
      .nullable()
      .optional(),
  }),
  items: z.array(
    z.object({
      feedItemId: z.uuid(),
      feedId: z.uuid(),
      rank: z.number(),
      status: z.enum(["pending", "rated", "dismissed"]),
      userRating: z.number().nullable(),
      ratedAt: z.date().nullable(),
      id: z.uuid(),
      sourceMovieId: z.number(),
      title: z.string(),
      releaseYear: z.number().nullable(),
      popularityBucket: z.string().nullable(),
      posterPath: z.string().nullable(),
      backdropPath: z.string().nullable(),
      genres: z.array(
        z.object({
          slug: z.string(),
          label: z.string(),
        }),
      ),
    }),
  ),
});

export const refreshRecommendationsBodySchema = z.object({
  limit: z.number().int().min(1).max(50).default(20).optional(),
});

export const rateRecommendationParamsSchema = z.object({
  feedItemId: z.string().uuid(),
});

export const rateRecommendationBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
});
