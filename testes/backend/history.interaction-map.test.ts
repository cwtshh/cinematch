import { describe, expect, test } from "bun:test";
import { buildInteractionMap } from "@/modules/history/history.interaction-map";
import type { FeedItemRow, RatingRow, WatchlistRow, DismissedRow } from "@/modules/history/history.interaction-map";

const uuid = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`;

const dt = (offsetMs = 0) => new Date(1_700_000_000_000 + offsetMs);

function feedItem(movieId: string, overrides: Partial<FeedItemRow> = {}): FeedItemRow {
  return {
    movieId,
    feedItemId: uuid(90),
    feedId: uuid(91),
    rank: 1,
    itemStatus: "pending",
    userRating: null,
    ratedAt: null,
    date: dt(),
    ...overrides,
  };
}

function rating(movieId: string, r = 4, date = dt()): RatingRow {
  return { movieId, rating: r, date };
}

function watchlist(movieId: string, date = dt()): WatchlistRow {
  return { movieId, date };
}

function dismissed(movieId: string, date = dt()): DismissedRow {
  return { movieId, date };
}

// ── Testes básicos ─────────────────────────────────────────────────────────

describe("buildInteractionMap — entradas vazias", () => {
  test("retorna mapa vazio quando não há interações", () => {
    const map = buildInteractionMap([], [], [], []);
    expect(map.size).toBe(0);
  });
});

// ── Fonte única ────────────────────────────────────────────────────────────

describe("buildInteractionMap — fonte única", () => {
  test("feedItem cria entrada com status do itemStatus", () => {
    const id = uuid(1);
    const map = buildInteractionMap([feedItem(id, { itemStatus: "pending" })], [], [], []);
    expect(map.size).toBe(1);
    expect(map.get(id)?.status).toBe("pending");
  });

  test("rating cria entrada com status 'rated' e nota correta", () => {
    const id = uuid(2);
    const map = buildInteractionMap([], [rating(id, 3)], [], []);
    const entry = map.get(id);
    expect(entry?.status).toBe("rated");
    expect(entry?.userRating).toBe(3);
  });

  test("watchlist cria entrada com status 'pending'", () => {
    const id = uuid(3);
    const map = buildInteractionMap([], [], [watchlist(id)], []);
    expect(map.get(id)?.status).toBe("pending");
  });

  test("dismissed cria entrada com status 'dismissed'", () => {
    const id = uuid(4);
    const map = buildInteractionMap([], [], [], [dismissed(id)]);
    expect(map.get(id)?.status).toBe("dismissed");
  });
});

// ── Deduplicação de feedItems ──────────────────────────────────────────────

describe("buildInteractionMap — deduplicação de feedItems", () => {
  test("mesmo filme em dois feeds: usa feedItemId do mais recente", () => {
    const id = uuid(5);
    const antigo = feedItem(id, { feedItemId: uuid(10), date: dt(0) });
    const recente = feedItem(id, { feedItemId: uuid(11), date: dt(1000) });
    const map = buildInteractionMap([antigo, recente], [], [], []);
    expect(map.size).toBe(1);
    expect(map.get(id)?.feedItemId).toBe(uuid(11));
  });

  test("feedItem mais antigo não sobrescreve o mais recente", () => {
    const id = uuid(6);
    const recente = feedItem(id, { feedItemId: uuid(20), date: dt(5000) });
    const antigo = feedItem(id, { feedItemId: uuid(21), date: dt(0) });
    const map = buildInteractionMap([recente, antigo], [], [], []);
    expect(map.get(id)?.feedItemId).toBe(uuid(20));
  });
});

// ── Prioridade de status ───────────────────────────────────────────────────

describe("buildInteractionMap — prioridade de status", () => {
  test("rating sobrescreve status do feedItem para 'rated'", () => {
    const id = uuid(7);
    const map = buildInteractionMap(
      [feedItem(id, { itemStatus: "pending" })],
      [rating(id, 5)],
      [],
      [],
    );
    const entry = map.get(id);
    expect(entry?.status).toBe("rated");
    expect(entry?.userRating).toBe(5);
  });

  test("watchlist não sobrescreve status 'rated'", () => {
    const id = uuid(8);
    const map = buildInteractionMap([], [rating(id, 4)], [watchlist(id, dt(9999))], []);
    expect(map.get(id)?.status).toBe("rated");
  });

  test("watchlist não sobrescreve status do feedItem", () => {
    const id = uuid(9);
    const map = buildInteractionMap(
      [feedItem(id, { itemStatus: "pending" })],
      [],
      [watchlist(id, dt(9999))],
      [],
    );
    expect(map.get(id)?.status).toBe("pending");
  });

  test("dismissed sobrescreve status 'rated'", () => {
    const id = uuid(10);
    const map = buildInteractionMap([], [rating(id, 4)], [], [dismissed(id)]);
    expect(map.get(id)?.status).toBe("dismissed");
  });

  test("dismissed sobrescreve status do feedItem 'rated'", () => {
    const id = uuid(11);
    const map = buildInteractionMap(
      [feedItem(id, { itemStatus: "rated", userRating: 3 })],
      [],
      [],
      [dismissed(id)],
    );
    expect(map.get(id)?.status).toBe("dismissed");
    expect(map.get(id)?.userRating).toBeNull();
  });

  test("dismissed sobrescreve mesmo com todas as fontes presentes", () => {
    const id = uuid(12);
    const map = buildInteractionMap(
      [feedItem(id, { itemStatus: "rated" })],
      [rating(id, 5)],
      [watchlist(id)],
      [dismissed(id, dt(99999))],
    );
    expect(map.get(id)?.status).toBe("dismissed");
  });
});

// ── Data mais recente ──────────────────────────────────────────────────────

describe("buildInteractionMap — data da interação", () => {
  test("rating mais recente atualiza a data da entrada", () => {
    const id = uuid(13);
    const dateFeed = dt(0);
    const dateRating = dt(5000);
    const map = buildInteractionMap(
      [feedItem(id, { date: dateFeed })],
      [rating(id, 4, dateRating)],
      [],
      [],
    );
    expect(map.get(id)?.date).toEqual(dateRating);
  });

  test("watchlist mais recente atualiza a data", () => {
    const id = uuid(14);
    const dateFeed = dt(0);
    const dateWatchlist = dt(8000);
    const map = buildInteractionMap(
      [feedItem(id, { date: dateFeed })],
      [],
      [watchlist(id, dateWatchlist)],
      [],
    );
    expect(map.get(id)?.date).toEqual(dateWatchlist);
  });

  test("watchlist mais antiga não retrocede a data", () => {
    const id = uuid(15);
    const dateRecente = dt(8000);
    const dateAntiga = dt(0);
    const map = buildInteractionMap(
      [feedItem(id, { date: dateRecente })],
      [],
      [watchlist(id, dateAntiga)],
      [],
    );
    expect(map.get(id)?.date).toEqual(dateRecente);
  });
});

// ── Múltiplos filmes ───────────────────────────────────────────────────────

describe("buildInteractionMap — múltiplos filmes", () => {
  test("cada filme recebe entrada independente", () => {
    const id1 = uuid(20);
    const id2 = uuid(21);
    const id3 = uuid(22);
    const map = buildInteractionMap(
      [feedItem(id1)],
      [rating(id2, 3)],
      [],
      [dismissed(id3)],
    );
    expect(map.size).toBe(3);
    expect(map.get(id1)?.status).toBe("pending");
    expect(map.get(id2)?.status).toBe("rated");
    expect(map.get(id3)?.status).toBe("dismissed");
  });
});
