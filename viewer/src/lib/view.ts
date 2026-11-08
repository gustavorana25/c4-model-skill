import { ancestors, hasChanges, hasChildren, isWithin, statusOf, type Model } from "./model";
import { typeMeta } from "./notation";
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
  /** Caixas abertas no lugar (além do caminho do foco): também viram boundaries. */
  open: Set<string>;
  /** Boundary pai de cada boundary (null = raiz do desenho). */
  boundaryParent: Map<string, string | null>;
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
 * Monta a view focada em `focus` (null = visão geral), com as caixas de `expanded`
 * abertas no lugar: elas viram boundaries e os filhos aparecem dentro, em qualquer nível.
 * - Os filhos do foco aparecem sempre.
 * - Elementos de fora aparecem só se tiverem relação com algo dentro do foco,
 *   no nível dos irmãos do foco/ancestrais.
 * - Relações entre elementos profundos são "elevadas" para as caixas visíveis e agregadas.
 */
export function computeView(doc: ArchDoc, m: Model, focus: string | null, expanded: ReadonlySet<string> = new Set()): View {
  const chain = focus ? [...ancestors(m, focus).reverse(), focus] : [];
  const focusEl = focus ? m.index.get(focus) : undefined;
  const inside = new Set((focusEl ? focusEl.children ?? [] : doc.elements).map((e) => e.id));
  // abre no lugar o que está expandido dentro do foco: a caixa sai e os filhos entram
  const open = new Set<string>();
  const queue = [...inside];
  while (queue.length) {
    const id = queue.shift()!;
    const el = m.index.get(id);
    if (!el || !expanded.has(id) || !hasChildren(el)) continue;
    open.add(id);
    inside.delete(id);
    for (const c of el.children!) {
      inside.add(c.id);
      queue.push(c.id);
    }
  }

  const candidates = new Set(inside);
  if (focus) {
    const levels = [doc.elements, ...chain.slice(0, -1).map((id) => m.index.get(id)?.children ?? [])];
    for (const lvl of levels) for (const e of lvl) if (!chain.includes(e.id)) candidates.add(e.id);
  }

  const toVisible = (id: string): string | null => {
    let cur: string | null = id;
    while (cur) {
      if (candidates.has(cur)) return cur;
      if (chain.includes(cur) || open.has(cur)) return null;
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

  const isBox = (id: string | null): id is string => !!id && (chain.includes(id) || open.has(id));
  const containerOf = (id: string) => {
    const p = m.parent.get(id) ?? null;
    return isBox(p) ? p : null;
  };
  // pais antes dos filhos, para o layout montar o aninhamento
  const boxes = [...chain, ...[...open].sort((a, b) => ancestors(m, a).length - ancestors(m, b).length)];
  const boundaryParent = new Map(boxes.map((id) => [id, containerOf(id)]));

  return {
    focus,
    chain,
    open,
    boundaryParent,
    inside,
    toVisible,
    boundaries: boxes.map((id) => m.index.get(id)!),
    nodes: [...visible].map((id) => ({ el: m.index.get(id)!, container: containerOf(id) })),
    edges: [...edges.values()],
  };
}

/** Abertura inicial: tudo que o plano toca, menos os tipos com autoOpen: false (no c4, component: o código fica fechado). */
export function defaultExpanded(m: Model): Set<string> {
  const out = new Set<string>();
  for (const el of m.index.values())
    if (typeMeta(m.notation, el.type).autoOpen && hasChildren(el) && hasChanges(el)) out.add(el.id);
  return out;
}

/** Abre os ancestrais de `id` para ele aparecer como caixa. */
export function revealing(m: Model, expanded: ReadonlySet<string>, id: string): Set<string> {
  const out = new Set(expanded);
  ancestors(m, id).forEach((a) => out.add(a));
  return out;
}
