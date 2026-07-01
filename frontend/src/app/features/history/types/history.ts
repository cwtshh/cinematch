export type HistoryItemStatus = "pending" | "rated" | "dismissed";

export type HistoryItemGenre = {
  slug: string;
  label: string;
};

export type HistoryItem = {
  feedItemId: string;
  feedId: string;
  rank: number;
  status: HistoryItemStatus;
  userRating: number | null;
  ratedAt: string | null;
  accessedAt: string;
  id: string;
  sourceMovieId: number;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
  genres: HistoryItemGenre[];
};

export type HistoryResponse = {
  accessed: HistoryItem[];
  rated: HistoryItem[];
};
