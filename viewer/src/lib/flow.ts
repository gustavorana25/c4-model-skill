import { ancestors, type Model } from "./model";
import type { ArchDoc, Hop, Relation } from "./types";
import { computeView, type View, type ViewEdge } from "./view";

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

/**
 * Nível mais detalhado em que o salto aparece como seta: dentro do pai da ponta mais
 * profunda (normalmente o componente que tem o código). Cai para o ancestral comum.
 */
export function hopFocus(doc: ArchDoc, m: Model, h: Hop): string | null {
  const depth = (id: string) => ancestors(m, id).length;
  const ends = [h.from, h.to].sort((a, b) => depth(b) - depth(a));
  const tried = new Set<string | null>();
  for (const end of ends) {
    for (const f of [m.parent.get(end) ?? null, ...ancestors(m, end).slice(1), null]) {
      if (tried.has(f)) continue;
      tried.add(f);
      if (hopVisible(computeView(doc, m, f), h)) return f;
    }
  }
  return null;
}

/** As setas da view que um salto percorre. */
export const hopEdges = (view: View, h: Hop): ViewEdge[] =>
  view.edges.filter((e) => e.rels.some((r) => (r.from === h.from && r.to === h.to) || (r.from === h.to && r.to === h.from)));
