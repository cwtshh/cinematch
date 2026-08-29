/**
 * Busca binaria sobre vetor ordenado.
 *
 * As duas primitivas abaixo nao procuram "o elemento igual a x": elas
 * localizam FRONTEIRAS. E isso que permite recuperar uma faixa inteira
 * de resultados, e nao apenas um registro, com custo O(log n).
 *
 *   lowerBound(v, x) -> primeira posicao i tal que v[i] >= x
 *   upperBound(v, x) -> primeira posicao i tal que v[i] >  x
 *
 * A faixa [lowerBound, upperBound) contem exatamente os elementos
 * iguais a x. Para prefixo, o truque esta em escolher os dois limites
 * certos (ver prefix-index.ts).
 */

export type Contador = { comparacoes: number };

/**
 * Primeira posicao cujo valor e maior ou igual ao alvo.
 *
 * Invariante mantida pelo laco: a resposta esta sempre no intervalo
 * [ini, fim]. Quando ini === fim o intervalo colapsou na resposta.
 *
 * Note que nao existe retorno antecipado ao "achar" o elemento: parar
 * cedo devolveria uma ocorrencia qualquer no meio do bloco de iguais,
 * e nos queremos a PRIMEIRA. Por isso o laco sempre roda os
 * ceil(log2(n)) passos completos.
 */
export function lowerBound(
  vetor: string[],
  alvo: string,
  contador?: Contador,
): number {
  let ini = 0;
  let fim = vetor.length;

  while (ini < fim) {
    // (ini + fim) >>> 1 em vez de (ini + fim) / 2: divisao inteira sem
    // risco de estouro e sem Math.floor.
    const meio = (ini + fim) >>> 1;

    if (contador) contador.comparacoes++;

    if ((vetor[meio] as string) < alvo) {
      ini = meio + 1;
    } else {
      fim = meio;
    }
  }

  return ini;
}

/** Primeira posicao cujo valor e estritamente maior que o alvo. */
export function upperBound(
  vetor: string[],
  alvo: string,
  contador?: Contador,
): number {
  let ini = 0;
  let fim = vetor.length;

  while (ini < fim) {
    const meio = (ini + fim) >>> 1;

    if (contador) contador.comparacoes++;

    if ((vetor[meio] as string) <= alvo) {
      ini = meio + 1;
    } else {
      fim = meio;
    }
  }

  return ini;
}

/**
 * Busca binaria classica por igualdade: devolve a posicao ou -1.
 *
 * Escrita a parte para servir de comparacao direta com a busca
 * sequencial na analise de complexidade.
 */
export function buscaBinaria(
  vetor: string[],
  alvo: string,
  contador?: Contador,
): number {
  let ini = 0;
  let fim = vetor.length - 1;

  while (ini <= fim) {
    const meio = (ini + fim) >>> 1;
    const valor = vetor[meio] as string;

    if (contador) contador.comparacoes++;

    if (valor === alvo) return meio;
    if (valor < alvo) {
      ini = meio + 1;
    } else {
      fim = meio - 1;
    }
  }

  return -1;
}
