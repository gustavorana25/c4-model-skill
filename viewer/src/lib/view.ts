import { ancestors, isWithin, statusOf, type Model } from "./model";
import type { ArchDoc, ArchElement, Relation, Status } from "./types";

export interface ViewEdge {
  id: string;
  from: string;
  to: string;
  rels: Relation[];
  status: Status;
}

export interface View {
  focus: string | null;
  /** Caminho da raiz até o foco (todos viram boundaries). */
  chain: string[];
  /** Filhos diretos do foco (ou elementos da raiz). */
  inside: Set<string>;
  boundaries: ArchElement[];
  nodes: { el: ArchElement; container: string | null }[];
  edges: ViewEdge[];
  /** Mapeia qualquer elemento para a caixa visível que o representa nesta view. */
  toVisible: (id: string) => string | null;
}

function aggregateStatus(rels: Relation[]): Status {
  const s = rels.map(statusOf);
  if (s.includes("new")) return "new";
  if (s.includes("changed")) return "changed";
  if (s.every((x) => x === "removed")) return "removed";
  if (s.includes("removed")) return "changed";
  return "unchanged";
}

/**
 * Monta a view C4 focada em `focus` (null = visão geral).
 * - Os filhos do foco aparecem sempre.
 * - Elementos de fora aparecem só se tiverem relação com algo dentro do foco,
 *   no nível dos irmãos do foco/ancestrais.
 * - Relações entre elementos profundos são "elevadas" para as caixas visíveis e agregadas.
 */
export function computeView(doc: ArchDoc, m: Model, focus: string | null): View {
  const chain = focus ? [...ancestors(m, focus).reverse(), focus] : [];
  const focusEl = focus ? m.index.get(focus) : undefined;
  const inside = new Set((focusEl ? focusEl.children ?? [] : doc.elements).map((e) => e.id));

  const candidates = new Set(inside);
  if (focus) {
    const levels = [doc.elements, ...chain.slice(0, -1).map((id) => m.index.get(id)?.children ?? [])];
    for (const lvl of levels) for (const e of lvl) if (!chain.includes(e.id)) candidates.add(e.id);
  }

  const toVisible = (id: string): string | null => {
    let cur: string | null = id;
    while (cur) {
      if (candidates.has(cur)) return cur;
      if (chain.includes(cur)) return null;
      cur = m.parent.get(cur) ?? null;
    }
    return null;
  };

  const edges = new Map<string, ViewEdge>();
  for (const r of doc.relations ?? []) {
    if (!m.index.has(r.from) || !m.index.has(r.to)) continue;
    if (focus && !isWithin(m, r.from, focus) && !isWithin(m, r.to, focus)) continue;
    const a = toVisible(r.from);
    const b = toVisible(r.to);
    if (!a || !b || a === b) continue;
    const key = `${a}→${b}`;
    if (!edges.has(key)) edges.set(key, { id: `e:${key}`, from: a, to: b, rels: [], status: "unchanged" });
    edges.get(key)!.rels.push(r);
  }
  for (const e of edges.values()) e.status = aggregateStatus(e.rels);

  const visible = new Set(inside);
  for (const e of edges.values()) visible.add(e.from).add(e.to);

  const containerOf = (id: string) => {
    const p = m.parent.get(id) ?? null;
    return p && chain.includes(p) ? p : null;
  };

  return {
    focus,
    chain,
    inside,
    toVisible,
    boundaries: chain.map((id) => m.index.get(id)!),
    nodes: [...visible].map((id) => ({ el: m.index.get(id)!, container: containerOf(id) })),
    edges: [...edges.values()],
  };
}
