import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/infra/database/client";
import { genre, movie, movieGenre, userMovieRating, userWatchlist } from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitleWithFallback } from "@/infra/integrations/tmdb/tmdb.service";

const GENRE_TRANSLATION_MAP: Record<string, string> = {
  acao: "action",
  animacao: "animation",
  aventura: "adventure",
  comedia: "comedy",
  crime: "crime",
  documentario: "documentary",
  drama: "drama",
  familia: "children",
  criancas: "children",
  infantil: "children",
  fantasia: "fantasy",
  historia: "history",
  terror: "horror",
  musica: "musical",
  musical: "musical",
  misterio: "mystery",
  romance: "romance",
  "ficcao cientifica": "sci_fi",
  ficcao: "sci_fi",
  suspense: "thriller",
  guerra: "war",
  faroeste: "western",
  noir: "film_noir",
  "filme noir": "film_noir",
};

type SearchParams = {
  title?: string;
  year?: number;
  genreText?: string;
  page: number;
  limit: number;
  userId?: string;
};

export async function searchMoviesAction({
  title,
  year,
  genreText,
  page,
  limit,
  userId,
}: SearchParams) {
  const offset = (page - 1) * limit;
  const conditions = [];

  if (title && title.trim() !== "") {
    conditions.push(
      or(
        ilike(movie.title, `%${title}%`),
        ilike(movie.tmdbTitle, `%${title}%`),
      ),
    );
  }

  if (year) {
    conditions.push(eq(movie.releaseYear, year));
  }

  if (genreText && genreText.trim() !== "") {
    const normalizedInput = genreText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    const englishTerm =
      GENRE_TRANSLATION_MAP[normalizedInput] || normalizedInput;

    conditions.push(
      or(
        ilike(genre.slug, `%${englishTerm}%`),
        ilike(genre.label, `%${englishTerm}%`),
        ilike(genre.label, `%${genreText}%`),
      ),
    );
  }

  if (conditions.length === 0) {
    return { movies: [], hasMore: false };
  }

  const rawResults = await db
    .select({
      id: movie.id,
      sourceMovieId: movie.sourceMovieId,
      title: movie.title,
      releaseYear: movie.releaseYear,
      popularityBucket: movie.popularityBucket,
      tmdbTitle: movie.tmdbTitle,
      overview: movie.overview,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
    })
    .from(movie)
    .leftJoin(movieGenre, eq(movie.id, movieGenre.movieId))
    .leftJoin(genre, eq(movieGenre.genreId, genre.id))
    .where(and(...conditions))
    .groupBy(
      movie.id, movie.title, movie.releaseYear, movie.popularityBucket,
      movie.tmdbTitle, movie.overview, movie.posterUrl, movie.backdropUrl,
    )
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rawResults.length > limit;
  const results = hasMore ? rawResults.slice(0, limit) : rawResults;

  const movieIds = results.map((r) => r.id);

  // busca avaliações e watchlist do usuário em paralelo
  const [ratingRows, watchlistRows, genreRelations] = await Promise.all([
    userId && movieIds.length > 0
      ? db
          .select({ movieId: userMovieRating.movieId, rating: userMovieRating.rating })
          .from(userMovieRating)
          .where(and(eq(userMovieRating.userId, userId), inArray(userMovieRating.movieId, movieIds)))
      : Promise.resolve([]),

    userId && movieIds.length > 0
      ? db
          .select({ movieId: userWatchlist.movieId })
          .from(userWatchlist)
          .where(and(eq(userWatchlist.userId, userId), inArray(userWatchlist.movieId, movieIds)))
      : Promise.resolve([]),

    movieIds.length > 0
      ? db
          .select({ movieId: movieGenre.movieId, slug: genre.slug, label: genre.label })
          .from(movieGenre)
          .innerJoin(genre, eq(movieGenre.genreId, genre.id))
          .where(inArray(movieGenre.movieId, movieIds))
      : Promise.resolve([]),
  ]);

  const ratingByMovieId = new Map<string, number>();
  for (const r of ratingRows) {
    ratingByMovieId.set(r.movieId, Number(r.rating));
  }

  const watchlistIds = new Set(watchlistRows.map((r) => r.movieId));

  const genresByMovieId = new Map<string, { slug: string; label: string }[]>();
  for (const rel of genreRelations) {
    const list = genresByMovieId.get(rel.movieId) ?? [];
    list.push({ slug: rel.slug, label: rel.label });
    genresByMovieId.set(rel.movieId, list);
  }

  const enrichedResults = await Promise.all(
    results.map(async (item) => {
      let tmdbData = {
        tmdbTitle: item.tmdbTitle ?? null,
        overview: item.overview ?? null,
        posterUrl: item.posterUrl ?? null,
        backdropUrl: item.backdropUrl ?? null,
      };

      if (!tmdbData.tmdbTitle && !tmdbData.overview && !tmdbData.posterUrl) {
        try {
          const tmdb = await searchFirstMovieByTitleWithFallback({
            title: item.title,
            year: item.releaseYear ?? undefined,
          });
          if (tmdb) {
            tmdbData = {
              tmdbTitle: tmdb.title ?? null,
              overview: tmdb.overview ?? null,
              posterUrl: tmdb.posterUrl ?? null,
              backdropUrl: tmdb.backdropUrl ?? null,
            };
            db.update(movie).set(tmdbData).where(eq(movie.id, item.id)).catch(() => {});
          }
        } catch {
          tmdbData = { tmdbTitle: null, overview: null, posterUrl: null, backdropUrl: null };
        }
      }

      return {
        ...item,
        ...tmdbData,
        genres: genresByMovieId.get(item.id) ?? [],
        userRating: ratingByMovieId.get(item.id) ?? null,
        inWatchlist: watchlistIds.has(item.id),
      };
    }),
  );

  return { movies: enrichedResults, hasMore };
}
