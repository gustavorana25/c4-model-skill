import { descendants, hasChanges, isWithin, type Model } from "./model";
import type { ArchDoc } from "./types";
import type { View, ViewEdge } from "./view";

export interface Dimmer {
  node: (id: string) => boolean;
  edge: (e: ViewEdge) => boolean;
}

const NONE: Dimmer = { node: () => false, edge: () => false };

/** O que fica apagado: tudo que o passo fixado não toca, ou o que não muda (modo "só mudanças"). */
export function computeDimmer(doc: ArchDoc, m: Model, view: View, pinnedStep: string | null, onlyChanges: boolean): Dimmer {
  const step = pinnedStep ? doc.steps?.find((s) => s.id === pinnedStep) : undefined;
  if (step) {
    const touched = new Set<string>();
    for (const t of step.touches) {
      const el = m.index.get(t);
      if (!el) continue;
      touched.add(t);
      descendants(el).forEach((d) => touched.add(d));
    }
    const vis = new Set([...touched].map(view.toVisible).filter((x): x is string => !!x));
    // passo que toca a própria boundary: os filhos dela contam
    for (const t of touched)
      if (view.chain.includes(t)) view.inside.forEach((i) => isWithin(m, i, t) && vis.add(i));
    return {
      node: (id) => !vis.has(id),
      edge: (e) => !e.rels.some((r) => touched.has(r.from) || touched.has(r.to)),
    };
  }
  if (onlyChanges) {
    return {
      node: (id) => !hasChanges(m.index.get(id)!),
      edge: (e) => e.status === "unchanged",
    };
  }
  return NONE;
}
