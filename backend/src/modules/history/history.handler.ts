import type { FastifyReply, FastifyRequest } from "fastify";
import { eq, inArray } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  recommendedFeed,
  recommendedFeedItem,
  userDismissedMovie,
  userMovieRating,
  userWatchlist,
} from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitleWithFallback } from "@/infra/integrations/tmdb/tmdb.service";
import { buildInteractionMap, type InteractionEntry, type InteractionStatus } from "./history.interaction-map";

const PAGE_SIZE = 20;

type MovieRow = {
  id: string;
  sourceMovieId: number;
  title: string;
  releaseYear: number | null;
  popularityBucket: string | null;
  tmdbTitle: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
};

async function enrichWithTmdbAndGenres(
  items: Array<InteractionEntry & { movie: MovieRow }>,
  watchlistIds: Set<string>,
) {
  if (items.length === 0) return [];

  const movieIds = items.map((i) => i.movie.id);

  const genreRelations = await db
    .select({ movieId: movieGenre.movieId, slug: genre.slug, label: genre.label })
    .from(movieGenre)
    .innerJoin(genre, eq(genre.id, movieGenre.genreId))
    .where(inArray(movieGenre.movieId, movieIds));

  const genresByMovieId = new Map<string, Array<{ slug: string; label: string }>>();
  for (const rel of genreRelations) {
    const curr = genresByMovieId.get(rel.movieId) ?? [];
    curr.push({ slug: rel.slug, label: rel.label });
    genresByMovieId.set(rel.movieId, curr);
  }

  return Promise.all(
    items.map(async (item) => {
      const m = item.movie;
      let tmdbData = {
        tmdbTitle: m.tmdbTitle ?? null,
        overview: m.overview ?? null,
        posterUrl: m.posterUrl ?? null,
        backdropUrl: m.backdropUrl ?? null,
      };

      if (!tmdbData.tmdbTitle && !tmdbData.overview && !tmdbData.posterUrl) {
        try {
          const tmdb = await searchFirstMovieByTitleWithFallback({
            title: m.title,
            year: m.releaseYear ?? undefined,
          });
          if (tmdb) {
            tmdbData = {
              tmdbTitle: tmdb.title ?? null,
              overview: tmdb.overview ?? null,
              posterUrl: tmdb.posterUrl ?? null,
              backdropUrl: tmdb.backdropUrl ?? null,
            };
            db.update(movie).set(tmdbData).where(eq(movie.id, m.id)).catch(() => {});
          }
        } catch {
          // continua sem dados TMDB
        }
      }

      return {
        feedItemId: item.feedItemId ?? m.id,
        feedId: item.feedId ?? "",
        rank: item.rank,
        status: item.status,
        userRating: item.userRating,
        ratedAt: item.ratedAt,
        accessedAt: item.date,
        id: m.id,
        sourceMovieId: m.sourceMovieId,
        title: m.title,
        ...tmdbData,
        releaseYear: m.releaseYear,
        popularityBucket: m.popularityBucket,
        inWatchlist: watchlistIds.has(m.id),
        genres: genresByMovieId.get(m.id) ?? [],
      };
    }),
  );
}

const MOVIE_SELECT = {
  id: movie.id,
  sourceMovieId: movie.sourceMovieId,
  title: movie.title,
  releaseYear: movie.releaseYear,
  popularityBucket: movie.popularityBucket,
  tmdbTitle: movie.tmdbTitle,
  overview: movie.overview,
  posterUrl: movie.posterUrl,
  backdropUrl: movie.backdropUrl,
} as const;

export async function getHistoryHandler(
  request: FastifyRequest<{ Querystring: { page?: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const page = Math.max(1, Number(request.query.page ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  // Busca todas as fontes de interação em paralelo
  const [feedItemRows, ratingRows, watchlistRows, dismissedRows] = await Promise.all([
    db
      .select({
        movieId: recommendedFeedItem.movieId,
        feedItemId: recommendedFeedItem.id,
        feedId: recommendedFeedItem.feedId,
        rank: recommendedFeedItem.rank,
        itemStatus: recommendedFeedItem.status,
        userRating: recommendedFeedItem.userRating,
        ratedAt: recommendedFeedItem.ratedAt,
        date: recommendedFeed.generatedAt,
      })
      .from(recommendedFeedItem)
      .innerJoin(recommendedFeed, eq(recommendedFeed.id, recommendedFeedItem.feedId))
      .where(eq(recommendedFeed.userId, userId)),

    db
      .select({
        movieId: userMovieRating.movieId,
        rating: userMovieRating.rating,
        date: userMovieRating.updatedAt,
      })
      .from(userMovieRating)
      .where(eq(userMovieRating.userId, userId)),

    db
      .select({ movieId: userWatchlist.movieId, date: userWatchlist.addedAt })
      .from(userWatchlist)
      .where(eq(userWatchlist.userId, userId)),

    db
      .select({ movieId: userDismissedMovie.movieId, date: userDismissedMovie.dismissedAt })
      .from(userDismissedMovie)
      .where(eq(userDismissedMovie.userId, userId)),
  ]);

  const watchlistIdSet = new Set(watchlistRows.map((r) => r.movieId));
  const dismissedIdSet = new Set(dismissedRows.map((r) => r.movieId));

  // Garante que filmes descartados nunca apareçam em "Avaliados" (dados legados)
  const filteredRatingRows = ratingRows.filter((r) => !dismissedIdSet.has(r.movieId));

  const interactionMap = buildInteractionMap(feedItemRows, ratingRows, watchlistRows, dismissedRows);

  // Ordena por data DESC e pagina
  const sorted = [...interactionMap.entries()].sort((a, b) => b[1].date.getTime() - a[1].date.getTime());
  const totalAccessed = sorted.length;
  const hasMore = totalAccessed > offset + PAGE_SIZE;
  const accessedPage = sorted.slice(offset, offset + PAGE_SIZE);

  // IDs necessários: página de acessados + todos os avaliados
  const accessedMovieIds = accessedPage.map(([movieId]) => movieId);
  const ratedMovieIds = filteredRatingRows.map((r) => r.movieId);
  const allNeededIds = [...new Set([...accessedMovieIds, ...ratedMovieIds])];

  if (allNeededIds.length === 0) {
    return reply.status(200).send({ accessed: [], rated: [], hasMore: false, page });
  }

  // Busca dados dos filmes em uma única query
  const movieRows = await db
    .select(MOVIE_SELECT)
    .from(movie)
    .where(inArray(movie.id, allNeededIds));

  const movieById = new Map(movieRows.map((m) => [m.id, m]));

  // Monta itens para "Acessados"
  const accessedItems = accessedPage
    .map(([movieId, entry]) => {
      const m = movieById.get(movieId);
      if (!m) return null;
      return { ...entry, movie: m };
    })
    .filter((item): item is InteractionEntry & { movie: MovieRow } => item !== null);

  // Monta itens para "Avaliados" (ordem: mais recente primeiro, sem descartados)
  const ratedItems = filteredRatingRows
    .slice()
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((row) => {
      const m = movieById.get(row.movieId);
      if (!m) return null;
      return {
        date: row.date,
        status: "rated" as InteractionStatus,
        userRating: row.rating,
        ratedAt: row.date,
        feedItemId: null,
        feedId: null,
        rank: 0,
        movie: m,
      };
    })
    .filter((item): item is InteractionEntry & { movie: MovieRow } => item !== null);

  const [accessed, rated] = await Promise.all([
    enrichWithTmdbAndGenres(accessedItems, watchlistIdSet),
    enrichWithTmdbAndGenres(ratedItems, watchlistIdSet),
  ]);

  return reply.status(200).send({ accessed, rated, hasMore, page, totalAccessed });
}
