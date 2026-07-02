/**
 * Calcula a nova nota após clicar em uma estrela.
 * Se allowUnrate=true e a estrela clicada já é a nota atual, retorna null (desavaliar).
 * Caso contrário, retorna o valor clicado.
 */
export function calcNewRating(
  current: number | null,
  value: number,
  allowUnrate: boolean,
): number | null {
  return allowUnrate && current === value ? null : value;
}
