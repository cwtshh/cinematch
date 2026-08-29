/**
 * Tabela hash com encadeamento separado, implementada do zero.
 *
 * Nenhum Map ou objeto do JavaScript e usado como armazenamento: os
 * baldes sao posicoes de um array e as colisoes formam listas
 * encadeadas de nos. O ponto do trabalho e o algoritmo, nao a
 * estrutura pronta da linguagem.
 */

type No<V> = {
  chave: string;
  valor: V;
  proximo: No<V> | null;
};

/**
 * Funcao hash de Horner para strings.
 *
 * Cada caractere multiplica o acumulado por 31 e soma seu codigo. O 31
 * e primo e impar: espalha os bits em vez de descartar os altos, que e
 * o que aconteceria com uma potencia de 2 (a multiplicacao viraria um
 * shift e os bits mais significativos seriam perdidos no modulo).
 *
 * O acumulador toma modulo a cada passo para nunca sair da faixa segura
 * de inteiro do JavaScript.
 */
export function hashHorner(chave: string, m: number): number {
  let valor = 0;

  for (let i = 0; i < chave.length; i++) {
    valor = (valor * 31 + chave.charCodeAt(i)) % m;
  }

  return valor;
}

/**
 * Metodo da divisao puro: soma os codigos e tira o resto.
 *
 * Existe para servir de contraexemplo na analise. Como ignora a posicao
 * dos caracteres, anagramas colidem sempre: "sto", "ost" e "tos" caem
 * no mesmo balde. Em trigramas de titulo isso e desastroso, porque
 * anagramas de tres letras sao abundantes.
 */
export function hashDivisao(chave: string, m: number): number {
  let soma = 0;

  for (let i = 0; i < chave.length; i++) {
    soma += chave.charCodeAt(i);
  }

  return soma % m;
}

export type FuncaoHash = (chave: string, m: number) => number;

export type EstatisticasTabela = {
  chaves: number;
  baldes: number;
  fatorCarga: number;
  baldesVazios: number;
  pctVazios: number;
  maiorCorrente: number;
  correnteMediaGlobal: number;
  correnteMediaOcupados: number;
  colisoesInsercao: number;
};

export class TabelaHash<V> {
  private m: number;
  private n = 0;
  private baldes: Array<No<V> | null>;
  private readonly funcao: FuncaoHash;
  private readonly cargaMax: number;

  /** Insercoes que cairam num balde ja ocupado. */
  colisoes = 0;

  /** Nos visitados percorrendo correntes. Instrumentacao para o relatorio. */
  sondagens = 0;

  constructor(
    capacidade = 1021,
    funcao: FuncaoHash = hashHorner,
    cargaMax = 2.0,
  ) {
    this.m = proximoPrimo(capacidade);
    this.baldes = new Array<No<V> | null>(this.m).fill(null);
    this.funcao = funcao;
    this.cargaMax = cargaMax;
  }

  get tamanho(): number {
    return this.n;
  }

  get fatorCarga(): number {
    return this.n / this.m;
  }

  inserir(chave: string, valor: V): void {
    const indice = this.funcao(chave, this.m);
    const cabeca = this.baldes[indice] ?? null;

    if (cabeca !== null) {
      this.colisoes++;
    }

    let atual = cabeca;
    while (atual !== null) {
      this.sondagens++;
      if (atual.chave === chave) {
        atual.valor = valor;
        return;
      }
      atual = atual.proximo;
    }

    this.baldes[indice] = { chave, valor, proximo: cabeca };
    this.n++;

    if (this.fatorCarga > this.cargaMax) {
      this.redimensionar();
    }
  }

  /**
   * Calcula o balde e percorre somente aquela corrente.
   *
   * Este e o ponto do algoritmo: o custo nao depende de quantas chaves
   * a tabela tem no total, e sim do comprimento da corrente, que o
   * fator de carga mantem curto.
   */
  buscar(chave: string): V | undefined {
    const indice = this.funcao(chave, this.m);
    let atual = this.baldes[indice] ?? null;

    while (atual !== null) {
      this.sondagens++;
      if (atual.chave === chave) {
        return atual.valor;
      }
      atual = atual.proximo;
    }

    return undefined;
  }

  /**
   * Remocao real: religa a corrente pulando o no.
   *
   * No encadeamento a remocao e limpa. Esse e o contraste com o
   * enderecamento aberto, onde apagar a posicao cortaria a cadeia de
   * sondagem de quem veio depois e seria preciso deixar uma lapide.
   */
  remover(chave: string): boolean {
    const indice = this.funcao(chave, this.m);
    let atual = this.baldes[indice] ?? null;
    let anterior: No<V> | null = null;

    while (atual !== null) {
      if (atual.chave === chave) {
        if (anterior === null) {
          this.baldes[indice] = atual.proximo;
        } else {
          anterior.proximo = atual.proximo;
        }
        this.n--;
        return true;
      }
      anterior = atual;
      atual = atual.proximo;
    }

    return false;
  }

  /**
   * Dobra a capacidade e reinsere tudo.
   *
   * Os hashes mudam porque m mudou, entao nao da para copiar os baldes:
   * e obrigatorio recalcular. Custa O(n), mas amortizado sobre as
   * insercoes fica O(1) por insercao.
   */
  private redimensionar(): void {
    const antigos = this.baldes;

    this.m = proximoPrimo(this.m * 2);
    this.baldes = new Array<No<V> | null>(this.m).fill(null);
    this.n = 0;

    for (const balde of antigos) {
      let atual = balde ?? null;
      while (atual !== null) {
        this.inserir(atual.chave, atual.valor);
        atual = atual.proximo;
      }
    }
  }

  /**
   * Metricas de qualidade do espalhamento.
   *
   * A media global e o proprio fator de carga e e a grandeza que a
   * teoria preve. A media sobre ocupados exclui os baldes vazios e por
   * isso sai sempre maior: as duas aparecem separadas de proposito,
   * para nao serem confundidas na analise.
   */
  estatisticas(): EstatisticasTabela {
    const comprimentos: number[] = [];
    let vazios = 0;

    for (const balde of this.baldes) {
      let tamanho = 0;
      let atual = balde ?? null;
      while (atual !== null) {
        tamanho++;
        atual = atual.proximo;
      }
      if (tamanho === 0) {
        vazios++;
      }
      comprimentos.push(tamanho);
    }

    const ocupados = comprimentos.filter((c) => c > 0);
    const somaOcupados = ocupados.reduce((a, b) => a + b, 0);

    return {
      chaves: this.n,
      baldes: this.m,
      fatorCarga: round(this.fatorCarga, 4),
      baldesVazios: vazios,
      pctVazios: round((100 * vazios) / this.m, 1),
      maiorCorrente: comprimentos.length > 0 ? Math.max(...comprimentos) : 0,
      correnteMediaGlobal: round(this.n / this.m, 4),
      correnteMediaOcupados:
        ocupados.length > 0 ? round(somaOcupados / ocupados.length, 4) : 0,
      colisoesInsercao: this.colisoes,
    };
  }

  /** Comprimento de cada balde. Alimenta o histograma do relatorio. */
  distribuicaoBaldes(): number[] {
    const comprimentos: number[] = [];

    for (const balde of this.baldes) {
      let tamanho = 0;
      let atual = balde ?? null;
      while (atual !== null) {
        tamanho++;
        atual = atual.proximo;
      }
      comprimentos.push(tamanho);
    }

    return comprimentos;
  }
}

function ehPrimo(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;

  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return false;
  }

  return true;
}

/** Capacidade prima evita padroes de colisao com chaves regulares. */
function proximoPrimo(n: number): number {
  let candidato = Math.max(2, Math.floor(n));
  while (!ehPrimo(candidato)) {
    candidato++;
  }
  return candidato;
}

function round(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}
