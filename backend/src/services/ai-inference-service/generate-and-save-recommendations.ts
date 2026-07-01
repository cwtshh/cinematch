import { generateRecommendationsForUser } from "./generate-recommendations";
import { saveRecommendationsFeed } from "./save-recommendations-feed";

type GenerateAndSaveRecommendationsInput = {
  userId: string;
  nRecommendations?: number;
};

export async function generateAndSaveRecommendationsForUser({
  userId,
  nRecommendations = 20,
}: GenerateAndSaveRecommendationsInput) {
  const items = await generateRecommendationsForUser({
    userId,
    nRecommendations,
  });

  const persisted = await saveRecommendationsFeed({
    userId,
    items,
  });

  return {
    feed: persisted.feed,
    items,
  };
}
