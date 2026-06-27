import { and, eq, sql } from "drizzle-orm";
import { db } from "@/infra/database/client";
import {
  recommendedFeed,
  recommendedFeedItem,
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
      await tx.insert(recommendedFeedItem).values(
        items.map((item, index) => ({
          feedId: feed.id,
          movieId: item.id,
          rank: index + 1,
          status: "pending" as const,
        })),
      );
    }

    return {
      feed,
      items,
    };
  });
}
