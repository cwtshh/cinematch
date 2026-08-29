import type { FastifyReply, FastifyRequest } from "fastify";
import { autocompleteQuerystringSchema } from "./search.schema";
import { obterIndicePrefixo } from "./shared/index-store";
import type { Contador } from "./prefix/binary-search";

/**
 * Autocomplete por prefixo.
 *
 * Rota propria porque o contrato e diferente do da busca: e chamada a
 * cada tecla digitada, precisa responder em fracao de milissegundo e
 * devolve poucos itens. Passar isso pelo ILIKE seria uma varredura
 * completa da tabela por caractere digitado.
 *
 * O `meta` traz o numero de comparacoes da busca binaria: e o dado que
 * torna o custo O(log n) visivel na tela, e nao apenas no relatorio.
 */
export async function autocompleteHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = autocompleteQuerystringSchema.safeParse(request.query);

  if (!parsed.success) {
    return reply.status(400).send({
      message: "Parâmetros inválidos.",
      issues: parsed.error.flatten(),
    });
  }

  const { q, limit } = parsed.data;

  const indice = await obterIndicePrefixo();
  const contador: Contador = { comparacoes: 0 };

  const inicio = performance.now();
  const sugestoes = indice.buscarPorPrefixo(q, limit, contador);
  const duracaoMs = performance.now() - inicio;

  return reply.send({
    data: sugestoes,
    meta: {
      query: q,
      count: sugestoes.length,
      totalMatches: indice.contarPorPrefixo(q),
      comparisons: contador.comparacoes,
      durationMs: Number(duracaoMs.toFixed(4)),
    },
  });
}
