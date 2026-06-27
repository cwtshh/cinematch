export type InferenceRatingItem = {
  source_movie_id: number;
  rating: number;
};

export type RecommendPayload = {
  user_id: string;
  ratings: InferenceRatingItem[];
  preference_genres: string[];
  era: "antigos" | "80_90" | "recentes" | null;
  popularity: "populares" | "nicho" | null;
  already_watched_source_movie_ids: number[];
  n_recommendations: number;
};

export type RecommendResponse = {
  source_movie_ids: number[];
};
