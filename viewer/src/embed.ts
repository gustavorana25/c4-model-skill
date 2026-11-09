/**
 * Modo iframe: `?embed` na URL (antes do #hash) mostra só o diagrama, sem cabeçalho nem painel
 * lateral. Ficam as ações do próprio diagrama: zoom, mover, enquadrar, abrir e fechar caixas.
 * Seleção, comentários, passos, fluxos e a ponte com o agente (window.blueroll) ficam de fora.
 */
export function isEmbed(search: string): boolean {
  const v = new URLSearchParams(search).get("embed");
  return v !== null && v !== "0" && v !== "false";
}

export const EMBED = typeof location !== "undefined" && isEmbed(location.search);
