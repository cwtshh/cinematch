export type RecommendationGenre = {
  slug: string;
  label: string;
};

export type RecommendationFeedContext = {
  source: "initial-rating" | "refresh" | "manual";
  ratingsCount: number;
  genres: string[];
  era: string | null;
  popularity: string | null;
};

export type RecommendationFeed = {
  id: string;
  userId: string;
  version: number;
  status: "active" | "archived";
  generatedAt: string;
  context: RecommendationFeedContext | null;
};

export type RecommendationItemStatus = "pending" | "rated" | "dismissed";

export type RecommendationItem = {
  feedItemId: string;
  feedId: string;
  rank: number;
  status: RecommendationItemStatus;
  userRating: number | null;
  ratedAt: string | null;
  id: string;
  sourceMovieId: number;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  backdropPath: string | null;
  genres: RecommendationGenre[];
  posterUrl: string | null;
  posterPath: string | null;
  backdropUrl: string | null;
};

export type ActiveRecommendationsResponse = {
  feed: RecommendationFeed | null;
  items: RecommendationItem[];
};
