/**
 * Indice de prefixo sobre vetor ordenado, para autocomplete.
 *
 * Complementa o indice de trigramas em vez de competir com ele:
 *
 *   - trigramas resolvem substring em qualquer posicao ("story" acha
 *     "Toy Story"), mas exigem no minimo 3 caracteres;
 *   - o vetor ordenado resolve prefixo a partir do PRIMEIRO caractere,
 *     que e o caso do usuario digitando na caixa de busca.
 *
 * Digitar "t" ou "to" precisa responder algo. O indice de trigramas
 * devolve vazio nos dois casos, porque nao existe trigrama de 1 ou 2
 * letras na tabela. E essa lacuna que a busca binaria cobre.
 *
 * Custo: O(log n) para achar as fronteiras da faixa, mais O(k) para
 * copiar os k resultados. Com ~43 mil chaves sao ~16 comparacoes por
 * fronteira, contra as 42.433 da varredura sequencial.
 */

import { lowerBound, upperBound, type Contador } from "./binary-search";
import { normalizar } from "../trigram/trigram-index";

export type FilmeIndexado = {
  id: string;
  title: string;
  tmdbTitle: string | null;
};

export type ResultadoPrefixo = {
  id: string;
  title: string;
};

/**
 * Artigos que o MovieLens move para o fim do titulo.
 *
 * O catalogo grava "Matrix, The (1999)" e nao "The Matrix (1999)". Sem
 * tratamento, quem digita "the matrix" nao acha nada: o prefixo real do
 * registro e "matrix,". Nao e defeito do algoritmo, e caracteristica do
 * dado, e o indice precisa conhece-la.
 */
const ARTIGOS = new Set([
  "the", "a", "an",
  "la", "le", "les",
  "el", "los", "las",
  "il", "lo", "gli", "i",
  "der", "die", "das", "ein", "eine",
  "o", "os", "as", "um", "uma",
  "de", "het", "en",
]);

const RE_ARTIGO_FINAL = /^(.+), ([^,()]+?)( \(\d{4}\))?$/;

/**
 * Traz o artigo de volta para a frente.
 *
 * "matrix, the (1999)" produz "the matrix (1999)". Devolve null quando
 * o padrao nao se aplica ou quando o termo apos a virgula nao e artigo
 * conhecido, para nao estragar titulos com virgula legitima.
 */
export function varianteSemArtigo(norm: string): string | null {
  const casou = RE_ARTIGO_FINAL.exec(norm);
  if (casou === null) return null;

  const corpo = casou[1];
  const artigo = casou[2];
  const ano = casou[3] ?? "";

  if (corpo === undefined || artigo === undefined) return null;
  if (!ARTIGOS.has(artigo.trim())) return null;

  return `${artigo.trim()} ${corpo}${ano}`;
}

export type EstatisticasPrefixo = {
  filmes: number;
  chaves: number;
  chavesAlternativas: number;
  tempoConstrucaoMs: number;
};

export class IndicePrefixo {
  /** Vetor ordenado das chaves: e sobre ele que a busca binaria roda. */
  private readonly chaves: string[] = [];

  /** Paralelo a `chaves`: a que filme cada chave pertence. */
  private readonly donos: number[] = [];

  private readonly ids: string[] = [];
  private readonly titulos: string[] = [];

  private chavesAlternativas = 0;
  private tempoConstrucaoMs = 0;

  constructor(filmes: FilmeIndexado[]) {
    this.construir(filmes);
  }

  /**
   * Monta o vetor e ordena.
   *
   * Cada filme contribui com o title, com o tmdbTitle quando existe, e
   * com as variantes de artigo de ambos. Por isso o vetor tem mais
   * chaves que filmes.
   *
   * A ordenacao usa o sort da linguagem: o algoritmo sob analise aqui e
   * a BUSCA, nao a ordenacao. (No trabalho de ordenacao, este e o ponto
   * natural para plugar um Merge Sort proprio e comparar.)
   */
  private construir(filmes: FilmeIndexado[]): void {
    const inicio = performance.now();

    const entradas: { chave: string; idx: number }[] = [];

    for (const filme of filmes) {
      const idx = this.ids.length;
      this.ids.push(filme.id);
      this.titulos.push(filme.title);

      const brutos = [filme.title];
      if (filme.tmdbTitle !== null && filme.tmdbTitle.trim() !== "") {
        brutos.push(filme.tmdbTitle);
      }

      const chavesDoFilme = new Set<string>();

      for (const bruto of brutos) {
        const norm = normalizar(bruto);
        chavesDoFilme.add(norm);

        const alternativa = varianteSemArtigo(norm);
        if (alternativa !== null && alternativa !== norm) {
          chavesDoFilme.add(alternativa);
          this.chavesAlternativas++;
        }
      }

      for (const chave of chavesDoFilme) {
        entradas.push({ chave, idx });
      }
    }

    entradas.sort((a, b) => (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0));

    for (const entrada of entradas) {
      this.chaves.push(entrada.chave);
      this.donos.push(entrada.idx);
    }

    this.tempoConstrucaoMs = performance.now() - inicio;
  }

  /**
   * Todos os titulos que comecam com o prefixo dado.
   *
   * A faixa e delimitada por duas buscas binarias:
   *
   *   inicio = lowerBound(prefixo)
   *   fim    = upperBound(prefixo + \uFFFF)
   *
   * O sentinela \uFFFF e a maior unidade de codigo UTF-16, entao
   * "toy\uFFFF" e maior que qualquer string que comece com "toy" e
   * menor que o que vem depois no alfabeto. Isso acha a fronteira
   * direita em O(log n), em vez de varrer a faixa testando startsWith.
   *
   * A deduplicacao existe porque um filme pode aparecer varias vezes na
   * faixa: pelo title, pelo tmdbTitle e pelas variantes de artigo.
   */
  buscarPorPrefixo(
    prefixo: string,
    limite = 10,
    contador?: Contador,
  ): ResultadoPrefixo[] {
    const alvo = normalizar(prefixo);
    if (alvo.length === 0) return [];

    const inicio = lowerBound(this.chaves, alvo, contador);
    const fim = upperBound(this.chaves, `${alvo}\uFFFF`, contador);

    const vistos = new Set<number>();
    const achados: ResultadoPrefixo[] = [];

    for (let i = inicio; i < fim && achados.length < limite; i++) {
      const idx = this.donos[i];
      if (idx === undefined || vistos.has(idx)) continue;
      vistos.add(idx);

      const id = this.ids[idx];
      const title = this.titulos[idx];
      if (id === undefined || title === undefined) continue;

      achados.push({ id, title });
    }

    return achados;
  }

  /** Quantas chaves casam com o prefixo, sem materializar a lista. */
  contarPorPrefixo(prefixo: string, contador?: Contador): number {
    const alvo = normalizar(prefixo);
    if (alvo.length === 0) return 0;

    const inicio = lowerBound(this.chaves, alvo, contador);
    const fim = upperBound(this.chaves, `${alvo}\uFFFF`, contador);

    return fim - inicio;
  }

  estatisticas(): EstatisticasPrefixo {
    return {
      filmes: this.ids.length,
      chaves: this.chaves.length,
      chavesAlternativas: this.chavesAlternativas,
      tempoConstrucaoMs: Math.round(this.tempoConstrucaoMs),
    };
  }
}
