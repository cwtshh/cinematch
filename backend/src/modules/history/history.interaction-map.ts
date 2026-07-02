export type InteractionStatus = "pending" | "rated" | "dismissed";

export type InteractionEntry = {
  date: Date;
  status: InteractionStatus;
  userRating: number | null;
  ratedAt: Date | null;
  feedItemId: string | null;
  feedId: string | null;
  rank: number;
};

export type FeedItemRow = {
  movieId: string;
  feedItemId: string;
  feedId: string;
  rank: number;
  itemStatus: string;
  userRating: number | null;
  ratedAt: Date | null;
  date: Date;
};

export type RatingRow = {
  movieId: string;
  rating: number;
  date: Date;
};

export type WatchlistRow = {
  movieId: string;
  date: Date;
};

export type DismissedRow = {
  movieId: string;
  date: Date;
};

/**
 * Constrói um mapa de interações do usuário com filmes, mesclando as quatro
 * fontes de dados possíveis. Cada filme aparece uma única vez. Regras de
 * prioridade:
 *
 * - dismissed  sobrescreve qualquer outro status (prioridade máxima)
 * - rated      sobrescreve pending
 * - watchlist  apenas atualiza a data se mais recente, não sobrescreve status
 * - feedItem   popula metadados (feedItemId, feedId, rank); em caso de
 *              duplicatas para o mesmo filme usa o feedItem mais recente
 */
export function buildInteractionMap(
  feedItemRows: FeedItemRow[],
  ratingRows: RatingRow[],
  watchlistRows: WatchlistRow[],
  dismissedRows: DismissedRow[],
): Map<string, InteractionEntry> {
  const map = new Map<string, InteractionEntry>();

  for (const row of feedItemRows) {
    const existing = map.get(row.movieId);
    if (!existing) {
      map.set(row.movieId, {
        date: row.date,
        status: row.itemStatus as InteractionStatus,
        userRating: row.userRating,
        ratedAt: row.ratedAt,
        feedItemId: row.feedItemId,
        feedId: row.feedId,
        rank: row.rank,
      });
    } else if (row.date > existing.date) {
      existing.date = row.date;
      existing.feedItemId = row.feedItemId;
      existing.feedId = row.feedId;
      existing.rank = row.rank;
    }
  }

  for (const row of ratingRows) {
    const existing = map.get(row.movieId);
    if (!existing) {
      map.set(row.movieId, {
        date: row.date,
        status: "rated",
        userRating: row.rating,
        ratedAt: row.date,
        feedItemId: null,
        feedId: null,
        rank: 0,
      });
    } else {
      existing.status = "rated";
      existing.userRating = row.rating;
      existing.ratedAt = row.date;
      if (row.date > existing.date) existing.date = row.date;
    }
  }

  for (const row of watchlistRows) {
    const existing = map.get(row.movieId);
    if (!existing) {
      map.set(row.movieId, {
        date: row.date,
        status: "pending",
        userRating: null,
        ratedAt: null,
        feedItemId: null,
        feedId: null,
        rank: 0,
      });
    } else if (row.date > existing.date) {
      existing.date = row.date;
    }
  }

  for (const row of dismissedRows) {
    const existing = map.get(row.movieId);
    if (!existing) {
      map.set(row.movieId, {
        date: row.date,
        status: "dismissed",
        userRating: null,
        ratedAt: null,
        feedItemId: null,
        feedId: null,
        rank: 0,
      });
    } else {
      existing.status = "dismissed";
      existing.userRating = null;
      existing.ratedAt = null;
      if (row.date > existing.date) existing.date = row.date;
    }
  }

  return map;
}
