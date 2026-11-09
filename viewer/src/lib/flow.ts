import type { ArchDoc, Hop, Relation } from "./types";
import type { View, ViewEdge } from "./view";

/** A relação que o salto percorre: no sentido dela, ou no contrário (resposta). */
export function hopRelation(doc: ArchDoc, h: Hop): { rel: Relation; reverse: boolean } | null {
  for (const r of doc.relations ?? []) {
    if (r.from === h.from && r.to === h.to) return { rel: r, reverse: false };
  }
  for (const r of doc.relations ?? []) {
    if (r.from === h.to && r.to === h.from) return { rel: r, reverse: true };
  }
  return null;
}

export const hopLabel = (doc: ArchDoc, h: Hop) => h.label ?? hopRelation(doc, h)?.rel.label ?? "";

/** O salto aparece como uma seta entre duas caixas diferentes nesta view? */
export function hopVisible(view: View, h: Hop) {
  const a = view.toVisible(h.from);
  const b = view.toVisible(h.to);
  return !!a && !!b && a !== b;
}

/** As setas da view que um salto percorre. */
export const hopEdges = (view: View, h: Hop): ViewEdge[] =>
  view.edges.filter((e) => e.rels.some((r) => (r.from === h.from && r.to === h.to) || (r.from === h.to && r.to === h.from)));

/** Onde o salto cai nesta view: dentro de uma caixa só, ou numa seta entre duas. */
function hopKey(view: View, h: Hop): string {
  const a = view.toVisible(h.from);
  const b = view.toVisible(h.to);
  return a === b ? `in:${a}` : `${a}>${b}`;
}

/**
 * Passos do fluxo nesta view: saltos seguidos que caem no mesmo card fechado (ou na mesma seta,
 * no mesmo sentido) viram um passo só, [primeiro, último] (0-based). Com tudo aberto, cada salto é um passo.
 */
export function hopGroups(view: View, hops: Hop[]): [number, number][] {
  const out: [number, number][] = [];
  let prev = "";
  hops.forEach((h, i) => {
    const k = hopKey(view, h);
    if (out.length && k === prev) out[out.length - 1][1] = i;
    else out.push([i, i]);
    prev = k;
  });
  return out;
}

/** O passo que contém o salto `i`. */
export const groupOf = (groups: [number, number][], i: number): [number, number] =>
  groups.find(([s, e]) => i >= s && i <= e) ?? [i, i];
