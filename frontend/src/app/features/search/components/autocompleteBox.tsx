import { useEffect, useRef, useState } from "react";
import { getAutocomplete } from "../api/getAutocomplete";
import type { AutocompleteItem } from "../types/Search";

/**
 * Autocomplete por prefixo, servido pela busca binária.
 *
 * Dispara a cada tecla, com um debounce curto (120 ms) apenas para não
 * inundar a rede — não porque a busca seja lenta. O `meta.comparisons`
 * exibido ao lado é o número de comparações que a busca binária gastou:
 * é o que torna o O(log n) visível na tela.
 *
 * Passar isto pelo ILIKE significaria uma varredura completa da tabela
 * a cada caractere digitado.
 */

const DEBOUNCE_MS = 120;

type Props = {
  value: string;
  onPick: (titulo: string) => void;
};

export function AutocompleteBox({ value, onPick }: Props) {
  const [itens, setItens] = useState<AutocompleteItem[]>([]);
  const [comparacoes, setComparacoes] = useState<number | null>(null);
  const [duracao, setDuracao] = useState<number | null>(null);
  const [aberto, setAberto] = useState(false);

  // Descarta respostas fora de ordem: sem isso, uma requisição lenta de
  // "to" pode chegar depois de "toy" e sobrescrever a lista correta.
  const requisicaoAtual = useRef(0);

  useEffect(() => {
    const termo = value.trim();

    if (termo.length === 0) {
      setItens([]);
      setComparacoes(null);
      setDuracao(null);
      return;
    }

    const id = ++requisicaoAtual.current;

    const timer = setTimeout(async () => {
      try {
        const resposta = await getAutocomplete(termo);
        if (id !== requisicaoAtual.current) return;

        setItens(resposta.data);
        setComparacoes(resposta.meta.comparisons);
        setDuracao(resposta.meta.durationMs);
        setAberto(true);
      } catch {
        if (id !== requisicaoAtual.current) return;
        setItens([]);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  if (!aberto || itens.length === 0) return null;

  return (
    <div className="relative">
      <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        {itens.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onPick(item.title);
              setAberto(false);
            }}
            className="block w-full px-4 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {item.title}
          </button>
        ))}

        {comparacoes !== null && (
          <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800">
            {comparacoes} comparações · {duracao?.toFixed(3)} ms
          </div>
        )}
      </div>
    </div>
  );
}
