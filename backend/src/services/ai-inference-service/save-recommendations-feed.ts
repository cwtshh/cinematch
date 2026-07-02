import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/infra/database/client";
import {
  recommendedFeed,
  recommendedFeedItem,
  userMovieRating,
  userPreference,
  userPreferenceGenre,
  genre,
  type recommendedFeed as RecommendedFeedTable,
} from "@/infra/database/drizzle/schema";

type RecommendationItemToPersist = {
  id: string;
};

type SaveRecommendationsFeedInput = {
  userId: string;
  items: RecommendationItemToPersist[];
};

export async function saveRecommendationsFeed({
  userId,
  items,
}: SaveRecommendationsFeedInput) {
  return await db.transaction(async (tx) => {
    const existingActiveFeed = await tx.query.recommendedFeed.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.userId, userId), eq(table.status, "active")),
      orderBy: (table, { desc }) => [desc(table.generatedAt)],
    });

    if (existingActiveFeed) {
      await tx
        .update(recommendedFeed)
        .set({
          status: "archived",
        })
        .where(eq(recommendedFeed.id, existingActiveFeed.id));
    }

    const preference = await tx.query.userPreference.findFirst({
      where: eq(userPreference.userId, userId),
    });

    const preferredGenres = await tx
      .select({
        slug: genre.slug,
      })
      .from(userPreferenceGenre)
      .innerJoin(genre, eq(genre.id, userPreferenceGenre.genreId))
      .where(eq(userPreferenceGenre.userId, userId));

    const nextVersion =
      existingActiveFeed?.version != null ? existingActiveFeed.version + 1 : 1;

    const [feed] = await tx
      .insert(recommendedFeed)
      .values({
        userId,
        version: nextVersion,
        status: "active",
        context: {
          source: "initial-rating",
          ratingsCount: items.length,
          genres: preferredGenres.map((item) => item.slug),
          era: preference?.era ?? null,
          popularity: preference?.popularity ?? null,
        },
      })
      .returning();

    if (!feed) {
      throw new Error("Não foi possível criar o feed de recomendações.");
    }

    if (items.length > 0) {
      const movieIds = items.map((item) => item.id);
      const existingRatings =
        movieIds.length > 0
          ? await tx
              .select({
                movieId: userMovieRating.movieId,
                rating: userMovieRating.rating,
              })
              .from(userMovieRating)
              .where(
                and(
                  eq(userMovieRating.userId, userId),
                  inArray(userMovieRating.movieId, movieIds),
                ),
              )
          : [];

      const ratingByMovieId = new Map(
        existingRatings.map((r) => [r.movieId, Number(r.rating)]),
      );

      await tx.insert(recommendedFeedItem).values(
        items.map((item, index) => {
          const existingRating = ratingByMovieId.get(item.id);
          return {
            feedId: feed.id,
            movieId: item.id,
            rank: index + 1,
            status: existingRating != null ? ("rated" as const) : ("pending" as const),
            userRating: existingRating ?? null,
            ratedAt: existingRating != null ? new Date() : null,
          };
        }),
      );
    }

    return {
      feed,
      items,
    };
  });
}
