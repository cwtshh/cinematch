import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/infra/database/client";
import {
  genre,
  movie,
  movieGenre,
  userMovieRating,
  userWatchlist,
} from "@/infra/database/drizzle/schema";
import { searchFirstMovieByTitleWithFallback } from "@/infra/integrations/tmdb/tmdb.service";
import { obterIndice, obterIndicePrefixo } from "./shared/index-store";
import { TAMANHO_GRAMA } from "./trigram/trigram-index";

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

/**
 * Estrategia de busca por titulo.
 *
 *   sql   - caminho original: dois ILIKE '%titulo%', que forcam Seq Scan
 *   index - indice invertido de trigramas em memoria
 *   both  - executa os dois, cronometra cada um e compara os resultados
 *
 * O modo `both` existe para a demonstracao e para o relatorio: ele
 * permite mostrar antes e depois na mesma requisicao, sem reiniciar o
 * servidor e sem depender de duas execucoes que poderiam pegar a
 * maquina em estados diferentes.
 */
export type SearchMode = "sql" | "index" | "both";

export type Timings = {
  mode: SearchMode;
  /** Tempo da fase de BUSCA por titulo, em ms. Nunca inclui o
   * enriquecimento via TMDB, que faz chamada de rede e mascararia a
   * diferenca entre os algoritmos. */
  sqlMs: number | null;
  indexMs: number | null;
  sqlCount: number | null;
  indexCount: number | null;
  /** Verdadeiro quando os dois caminhos devolveram exatamente o mesmo
   * conjunto de ids. Ver nota sobre acentos abaixo. */
  identical: boolean | null;
  /** Ids achados so pelo indice. Esperado ser > 0 em consultas
   * acentuadas: o ILIKE e insensivel a caixa mas nao a acento, o indice
   * e insensivel aos dois. */
  onlyIndex: number | null;
  onlySql: number | null;
  usedPrefixIndex: boolean;
};

type SearchParams = {
  title?: string;
  year?: number;
  genreText?: string;
  page: number;
  limit: number;
  userId?: string;
  mode?: SearchMode;
};

function condicaoTituloSql(title: string) {
  return or(
    ilike(movie.title, `%${title}%`),
    ilike(movie.tmdbTitle, `%${title}%`),
  );
}

/** Busca os ids pelo caminho SQL original, isolada para cronometragem. */
async function idsPorSql(title: string): Promise<string[]> {
  const linhas = await db
    .select({ id: movie.id })
    .from(movie)
    .where(condicaoTituloSql(title));

  return linhas.map((l) => l.id);
}

export async function searchMoviesAction({
  title,
  year,
  genreText,
  page,
  limit,
  userId,
  mode = "sql",
}: SearchParams) {
  const offset = (page - 1) * limit;
  const conditions = [];

  const timings: Timings = {
    mode,
    sqlMs: null,
    indexMs: null,
    sqlCount: null,
    indexCount: null,
    identical: null,
    onlyIndex: null,
    onlySql: null,
    usedPrefixIndex: false,
  };

  const temTitulo = title !== undefined && title.trim() !== "";

  if (temTitulo) {
    const termo = title.trim();

    if (mode === "sql") {
      // Caminho original, inalterado: o filtro entra na consulta
      // principal e o Postgres varre a tabela.
      const t0 = performance.now();
      conditions.push(condicaoTituloSql(termo));
      timings.sqlMs = performance.now() - t0;
    } else {
      // Consulta com menos de 3 caracteres nao gera trigrama. Nesse
      // caso a busca binaria por prefixo assume: e o unico caminho que
      // responde a partir do primeiro caractere digitado.
      let ids: string[];

      if (termo.length < TAMANHO_GRAMA) {
        const prefixo = await obterIndicePrefixo();
        const t0 = performance.now();
        ids = prefixo.buscarPorPrefixo(termo, 500).map((f) => f.id);
        timings.indexMs = performance.now() - t0;
        timings.usedPrefixIndex = true;
      } else {
        const indice = await obterIndice();
        const t0 = performance.now();
        ids = indice.buscar(termo);
        timings.indexMs = performance.now() - t0;
      }

      timings.indexCount = ids.length;

      if (mode === "both") {
        const t1 = performance.now();
        const idsSql = await idsPorSql(termo);
        timings.sqlMs = performance.now() - t1;
        timings.sqlCount = idsSql.length;

        const setIndex = new Set(ids);
        const setSql = new Set(idsSql);

        let soSql = 0;
        for (const id of setSql) if (!setIndex.has(id)) soSql++;

        let soIndex = 0;
        for (const id of setIndex) if (!setSql.has(id)) soIndex++;

        timings.onlySql = soSql;
        timings.onlyIndex = soIndex;
        timings.identical = soSql === 0 && soIndex === 0;
      }

      if (ids.length === 0) {
        return { movies: [], hasMore: false, timings };
      }

      conditions.push(inArray(movie.id, ids));
    }
  }

  if (year) {
    conditions.push(eq(movie.releaseYear, year));
  }

  if (genreText && genreText.trim() !== "") {
    const normalizedInput = genreText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

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
    return { movies: [], hasMore: false, timings };
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

  // Enriquecimento sob demanda via TMDB. Fica DEPOIS da cronometragem
  // de proposito: e uma chamada de rede por filme sem cache, e incluir
  // isso na medicao mascararia completamente a diferenca entre os
  // algoritmos de busca.
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

  return { movies: enrichedResults, hasMore, timings };
}
