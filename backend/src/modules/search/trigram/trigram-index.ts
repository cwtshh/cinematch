/**
 * Indice invertido de trigramas sobre a tabela hash.
 *
 * Problema original: o filtro de titulo do Cinematch faz
 *
 *     or(
 *       ilike(movie.title,     `%${title}%`),
 *       ilike(movie.tmdbTitle, `%${title}%`),
 *     )
 *
 * Um LIKE com curinga a esquerda nao pode usar indice B-tree, entao o
 * Postgres varre a tabela inteira. E sao DUAS varreduras por consulta,
 * porque sao duas colunas.
 *
 * Solucao: quebrar os titulos e a consulta em pedacos de 3 caracteres.
 * Cada trigrama vira chave numa tabela hash apontando para a lista
 * ordenada dos filmes que o contem. A consulta intersecta essas listas
 * e so verifica os poucos candidatos sobreviventes.
 *
 * E o mesmo principio do pg_trgm, a extensao do Postgres feita
 * exatamente para esse caso.
 */

import { TabelaHash, hashHorner, type FuncaoHash } from "./hash-table";

export const TAMANHO_GRAMA = 3;

export type FilmeIndexado = {
  id: string;
  title: string;
  tmdbTitle: string | null;
};

/**
 * Reduz o texto a uma forma canonica: minusculas, sem acentos, espacos
 * colapsados.
 *
 * Precisa ser identica na indexacao e na consulta, senao "amelie" nunca
 * acharia "Amelie".
 *
 * Consequencia importante para a comparacao: o ILIKE do Postgres e
 * insensivel a maiusculas mas NAO a acentos. O indice, por normalizar,
 * e insensivel aos dois. Entao para consultas acentuadas o indice pode
 * achar MAIS resultados que o SQL. Isso nao e divergencia por erro, e
 * um ganho de qualidade, e o painel de comparacao reporta a diferenca
 * em vez de esconde-la.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fatia o texto em janelas deslizantes de 3 caracteres.
 *
 * "toy story" produz "toy", "oy ", "y s", " st", "sto", "tor", "ory".
 * Os espacos entram de proposito: carregam informacao de fronteira de
 * palavra.
 */
export function trigramas(texto: string): string[] {
  if (texto.length === 0) return [];
  if (texto.length < TAMANHO_GRAMA) return [texto];

  const gramas: string[] = [];
  for (let i = 0; i <= texto.length - TAMANHO_GRAMA; i++) {
    gramas.push(texto.slice(i, i + TAMANHO_GRAMA));
  }

  return gramas;
}

/**
 * Intersecao de duas listas ordenadas por avanco de dois ponteiros.
 *
 * Este e o passo de merge do Mergesort: duas listas ordenadas, dois
 * indices, avanco linear. Custa O(a + b) em vez dos O(a * b) de uma
 * busca aninhada.
 *
 * As listas de postagem nascem ordenadas porque os filmes sao indexados
 * na ordem em que vem do banco.
 */
export function intersectar(a: number[], b: number[]): number[] {
  const resultado: number[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    const va = a[i] as number;
    const vb = b[j] as number;

    if (va === vb) {
      resultado.push(va);
      i++;
      j++;
    } else if (va < vb) {
      i++;
    } else {
      j++;
    }
  }

  return resultado;
}

export type EstatisticasIndice = {
  filmes: number;
  textosIndexados: number;
  trigramasDistintos: number;
  postagensTotais: number;
  tempoConstrucaoMs: number;
  tabela: ReturnType<TabelaHash<number[]>["estatisticas"]>;
};

export class IndiceTrigrama {
  private readonly tabela: TabelaHash<number[]>;
  private readonly ids: string[] = [];

  /**
   * Textos normalizados de cada filme: o title e, quando existe, o
   * tmdbTitle. Um filme pode ter dois textos, e casar por qualquer um
   * deles — exatamente como o OR de dois ILIKE faz hoje.
   */
  private readonly textos: string[][] = [];

  private textosIndexados = 0;
  private postagensTotais = 0;
  private tempoConstrucaoMs = 0;

  constructor(
    filmes: FilmeIndexado[],
    funcao: FuncaoHash = hashHorner,
    capacidade = 16381,
  ) {
    this.tabela = new TabelaHash<number[]>(capacidade, funcao);
    this.construir(filmes);
  }

  private construir(filmes: FilmeIndexado[]): void {
    const inicio = performance.now();

    for (const filme of filmes) {
      const idx = this.ids.length;
      this.ids.push(filme.id);

      const textos: string[] = [normalizar(filme.title)];

      const tmdb = filme.tmdbTitle;
      if (tmdb !== null && tmdb.trim() !== "") {
        const normTmdb = normalizar(tmdb);
        if (normTmdb !== textos[0]) textos.push(normTmdb);
      }

      this.textos.push(textos);
      this.textosIndexados += textos.length;

      // Um Set por FILME (nao por texto): se o mesmo trigrama aparece
      // no title e no tmdbTitle, o filme so pode entrar uma vez na
      // lista de postagem. Duplicata ali quebraria a intersecao, que
      // assume listas estritamente crescentes.
      const vistos = new Set<string>();

      for (const texto of textos) {
        for (const grama of trigramas(texto)) {
          if (vistos.has(grama)) continue;
          vistos.add(grama);

          const postagens = this.tabela.buscar(grama);
          if (postagens === undefined) {
            this.tabela.inserir(grama, [idx]);
          } else {
            postagens.push(idx);
          }
          this.postagensTotais++;
        }
      }
    }

    this.tempoConstrucaoMs = performance.now() - inicio;
  }

  /**
   * Busca por substring. Devolve os ids dos filmes.
   *
   * Tres fases:
   *   1. gera os trigramas da consulta;
   *   2. recupera a lista de postagem de cada um e as intersecta,
   *      comecando pelas menores para encolher cedo o conjunto;
   *   3. verifica os candidatos sobreviventes.
   *
   * A fase 3 e obrigatoria: a intersecao produz falsos positivos. Um
   * titulo pode conter todos os trigramas de "story" espalhados sem
   * conter a palavra. O indice reduz o universo de 42.433 para dezenas;
   * o teste de substring decide o resto.
   */
  buscar(consulta: string): string[] {
    const alvo = normalizar(consulta);
    const gramas = trigramas(alvo);

    if (gramas.length === 0) return [];

    const listas: number[][] = [];

    for (const grama of gramas) {
      const postagens = this.tabela.buscar(grama);

      // Trigrama inexistente: nenhum titulo contem a consulta. Esta e a
      // resposta mais barata do indice, e e o pior caso da varredura.
      if (postagens === undefined) return [];

      listas.push(postagens);
    }

    listas.sort((x, y) => x.length - y.length);

    let candidatos = listas[0] as number[];

    for (let k = 1; k < listas.length; k++) {
      candidatos = intersectar(candidatos, listas[k] as number[]);
      if (candidatos.length === 0) return [];
    }

    const achados: string[] = [];

    for (const idx of candidatos) {
      const textos = this.textos[idx];
      const id = this.ids[idx];
      if (textos === undefined || id === undefined) continue;

      for (const texto of textos) {
        if (texto.includes(alvo)) {
          achados.push(id);
          break;
        }
      }
    }

    return achados;
  }

  estatisticas(): EstatisticasIndice {
    return {
      filmes: this.ids.length,
      textosIndexados: this.textosIndexados,
      trigramasDistintos: this.tabela.tamanho,
      postagensTotais: this.postagensTotais,
      tempoConstrucaoMs: Math.round(this.tempoConstrucaoMs),
      tabela: this.tabela.estatisticas(),
    };
  }

  distribuicaoBaldes(): number[] {
    return this.tabela.distribuicaoBaldes();
  }
}
