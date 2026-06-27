import { and, eq } from "drizzle-orm";

import { db } from "@/infra/database/client";
import {
  recommendedFeed,
  recommendedFeedItem,
  userMovieRating,
} from "@/infra/database/drizzle/schema";

type RateRecommendationInput = {
  userId: string;
  feedItemId: string;
  rating: number;
};

export async function rateRecommendation({
  userId,
  feedItemId,
  rating,
}: RateRecommendationInput) {
  const result = await db
    .select({
      feedItemId: recommendedFeedItem.id,
      movieId: recommendedFeedItem.movieId,
    })
    .from(recommendedFeedItem)
    .innerJoin(
      recommendedFeed,
      eq(recommendedFeed.id, recommendedFeedItem.feedId),
    )
    .where(
      and(
        eq(recommendedFeedItem.id, feedItemId),
        eq(recommendedFeed.userId, userId),
      ),
    )
    .limit(1);

  const item = result[0];

  if (!item) {
    return null;
  }

  await db
    .insert(userMovieRating)
    .values({
      userId,
      movieId: item.movieId,
      rating,
    })
    .onConflictDoUpdate({
      target: [userMovieRating.userId, userMovieRating.movieId],
      set: {
        rating,
        updatedAt: new Date(),
      },
    });

  const now = new Date();

  await db
    .update(recommendedFeedItem)
    .set({
      status: "rated",
      userRating: rating,
      ratedAt: now,
    })
    .where(eq(recommendedFeedItem.id, feedItemId));

  return {
    feedItemId,
    status: "rated" as const,
    userRating: rating,
    ratedAt: now,
  };
}
