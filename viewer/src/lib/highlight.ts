import { descendants, hasChanges, isWithin, type Model } from "./model";
import { hopEdges } from "./flow";
import type { ArchDoc } from "./types";
import type { View, ViewEdge } from "./view";

export interface Dimmer {
  node: (id: string) => boolean;
  edge: (e: ViewEdge) => boolean;
}

const NONE: Dimmer = { node: () => false, edge: () => false };

export interface FlowMarks {
  /** Números (1-based) dos saltos já percorridos que passam por esta seta. */
  edgeNums: Map<string, number[]>;
  /** Setas e caixas do salto atual. */
  activeEdges: Set<string>;
  activeNodes: Set<string>;
  /** Caixas tocadas pelos saltos já percorridos. */
  litNodes: Set<string>;
  /** O salto atual acontece dentro de uma caixa só (não vira seta neste nível). */
  insideNode: string | null;
}

/** Marcas do fluxo aberto até o salto `upto` (0-based) nesta view. */
export function flowMarks(doc: ArchDoc, view: View, flowId: string, upto: number): FlowMarks | null {
  const flow = doc.flows?.find((f) => f.id === flowId);
  if (!flow) return null;
  const marks: FlowMarks = { edgeNums: new Map(), activeEdges: new Set(), activeNodes: new Set(), litNodes: new Set(), insideNode: null };
  flow.hops.slice(0, upto + 1).forEach((h, i) => {
    const a = view.toVisible(h.from);
    const b = view.toVisible(h.to);
    if (a) marks.litNodes.add(a);
    if (b) marks.litNodes.add(b);
    for (const e of hopEdges(view, h)) {
      marks.edgeNums.set(e.id, [...(marks.edgeNums.get(e.id) ?? []), i + 1]);
      if (i === upto) marks.activeEdges.add(e.id);
    }
    if (i === upto) {
      if (a) marks.activeNodes.add(a);
      if (b) marks.activeNodes.add(b);
      if (a && a === b) marks.insideNode = a;
    }
  });
  return marks;
}

/** O que fica apagado: tudo que o passo fixado não toca, ou o que não muda (modo "só mudanças"). */
export function computeDimmer(
  doc: ArchDoc,
  m: Model,
  view: View,
  pinnedStep: string | null,
  onlyChanges: boolean,
  flow: FlowMarks | null = null,
): Dimmer {
  if (flow) {
    return { node: (id) => !flow.litNodes.has(id), edge: (e) => !flow.edgeNums.has(e.id) };
  }
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
      if (view.chain.includes(t) || view.open.has(t)) view.inside.forEach((i) => isWithin(m, i, t) && vis.add(i));
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
