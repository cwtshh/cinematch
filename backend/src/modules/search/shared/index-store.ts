/**
 * Ciclo de vida dos indices em memoria.
 *
 * Os dois indices sao construidos a partir da MESMA leitura do banco:
 * uma unica query traz id, title e tmdbTitle de todos os filmes, e as
 * duas estruturas se alimentam dela. Ler o catalogo duas vezes seria
 * desperdicio e abriria janela para os indices divergirem.
 *
 * Limitacao assumida e declarada: indice em memoria se perde a cada
 * restart e nao e compartilhado entre instancias do processo. Esse e o
 * custo que o ILIKE nao tem. Para uma instancia unica o ganho de
 * latencia compensa; com varias replicas a solucao equivalente seria um
 * indice GIN com pg_trgm dentro do proprio Postgres, que e a versao
 * industrial da mesma ideia.
 */

import { db } from "@/infra/database/client";
import { movie } from "@/infra/database/drizzle/schema";
import { IndicePrefixo } from "../prefix/prefix-index";
import { IndiceTrigrama, type FilmeIndexado } from "../trigram/trigram-index";

export type Indices = {
  trigrama: IndiceTrigrama;
  prefixo: IndicePrefixo;
  construidoEm: Date;
  tempoTotalMs: number;
};

let indices: Indices | null = null;
let construindo: Promise<Indices> | null = null;

async function carregarFilmes(): Promise<FilmeIndexado[]> {
  return db
    .select({
      id: movie.id,
      title: movie.title,
      tmdbTitle: movie.tmdbTitle,
    })
    .from(movie);
}

/**
 * Devolve os indices, construindo-os se ainda nao existirem.
 *
 * A promessa em `construindo` evita build duplicado quando varias
 * requisicoes chegam juntas antes da primeira terminar: todas esperam o
 * mesmo trabalho em vez de dispararem uma construcao cada.
 */
export async function obterIndices(): Promise<Indices> {
  if (indices !== null) return indices;

  if (construindo === null) {
    construindo = (async () => {
      const inicio = performance.now();
      const filmes = await carregarFilmes();

      const novos: Indices = {
        trigrama: new IndiceTrigrama(filmes),
        prefixo: new IndicePrefixo(filmes),
        construidoEm: new Date(),
        tempoTotalMs: 0,
      };
      novos.tempoTotalMs = Math.round(performance.now() - inicio);

      indices = novos;
      construindo = null;
      return novos;
    })();
  }

  return construindo;
}

export async function obterIndice(): Promise<IndiceTrigrama> {
  return (await obterIndices()).trigrama;
}

export async function obterIndicePrefixo(): Promise<IndicePrefixo> {
  return (await obterIndices()).prefixo;
}

/** Forca a reconstrucao. Util apos importar filmes novos. */
export async function reconstruirIndices(): Promise<Indices> {
  indices = null;
  construindo = null;
  return obterIndices();
}

export function indicesEstaoProntos(): boolean {
  return indices !== null;
}
