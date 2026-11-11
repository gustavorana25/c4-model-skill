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

/**
 * `?embed&zoom=0.8`: zoom mínimo do enquadramento no iframe. Sem ele, um diagrama grande encolhe
 * até caber e o texto some; com ele, a câmera para nesse zoom, centraliza, e o leitor arrasta.
 * Fora de 0.1–2.5 (os limites do canvas) ou sem número, fica sem mínimo.
 */
export function embedZoom(search: string): number | undefined {
  const raw = new URLSearchParams(search).get("zoom");
  if (raw === null || raw.trim() === "") return undefined;
  const z = Number(raw);
  return Number.isFinite(z) && z >= 0.1 && z <= 2.5 ? z : undefined;
}

export const EMBED_ZOOM = EMBED ? embedZoom(location.search) : undefined;
