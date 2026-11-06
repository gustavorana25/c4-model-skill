import ELK, { type ElkNode, type ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { View, ViewEdge } from "./view";
import type { ArchElement } from "./types";
import { hasChildren } from "./model";
import { STATUS_META } from "./meta";

export const NODE_W = 228;

export type ElementNodeData = {
  el: ArchElement;
  hasChildren: boolean;
  dim?: boolean;
  selected?: boolean;
  /** Faz parte do comentário que está sendo escrito. */
  commentTarget?: boolean;
  /** Ponta do salto atual do fluxo aberto. */
  flowActive?: boolean;
};
export type BoundaryNodeData = { el: ArchElement; isFocus: boolean; /** Aberta no lugar (dá para fechar). */ open: boolean };
export type RelationEdgeData = {
  edge: ViewEdge;
  points: { x: number; y: number }[];
  label: { x: number; y: number; width: number; height: number } | null;
  text: string;
  proto: string;
  dim?: boolean;
  selected?: boolean;
  /** Números dos saltos do fluxo que passam por esta seta. */
  flowNums?: number[];
  flowActive?: boolean;
};

export type ElementFlowNode = Node<ElementNodeData, "element">;
export type BoundaryFlowNode = Node<BoundaryNodeData, "boundary">;
export type FlowNode = ElementFlowNode | BoundaryFlowNode;
export type RelationFlowEdge = Edge<RelationEdgeData, "relation">;

const elk = new ELK();

// A altura é estimada antes do layout (o ELK precisa do tamanho); o card corta o excedente.
export function nodeHeight(el: ArchElement): number {
  const usable = NODE_W - 28;
  const nameLines = Math.max(1, Math.ceil((el.name.length * 8.4) / usable));
  const descLines = el.description ? Math.min(2, Math.ceil((el.description.length * 6.5) / usable)) : 0;
  const badges = el.status && el.status !== "unchanged" ? true : hasChildren(el);
  return 24 + 16 + 4 + nameLines * 19 + (descLines ? 4 + descLines * 16 : 0) + (badges ? 30 : 4);
}

export function edgeText(e: ViewEdge): [string, string] {
  if (e.rels.length > 1) return [`${e.rels.length} relações`, ""];
  const r = e.rels[0];
  return [r.label ?? "", r.protocol ?? ""];
}

function labelSize(e: ViewEdge) {
  const [main, proto] = edgeText(e);
  const width = Math.min(Math.max(main.length * 6.4, proto.length * 5.8) + 18, 210);
  return { width, height: proto ? 34 : 22 };
}

export async function layoutView(view: View): Promise<{ nodes: FlowNode[]; edges: RelationFlowEdge[] }> {
  const root: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.spacing.nodeNode": "56",
      "elk.spacing.edgeNode": "28",
      "elk.spacing.edgeEdge": "16",
      "elk.spacing.edgeLabel": "8",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
    },
    children: [],
    edges: [],
  };
  const byId = new Map<string, ElkNode>([["root", root]]);
  for (const b of view.boundaries) {
    const n: ElkNode = { id: b.id, children: [], layoutOptions: { "elk.padding": "[top=52,left=28,bottom=28,right=28]" } };
    const p = view.boundaryParent.get(b.id);
    (p ? byId.get(p)! : root).children!.push(n);
    byId.set(b.id, n);
  }
  for (const { el, container } of view.nodes) {
    byId.get(container ?? "root")!.children!.push({ id: el.id, width: NODE_W, height: nodeHeight(el) });
  }
  for (const e of view.edges) {
    const edge: ElkExtendedEdge = {
      id: e.id,
      sources: [e.from],
      targets: [e.to],
      labels: edgeText(e)[0] ? [{ text: edgeText(e)[0], ...labelSize(e) }] : [],
    };
    root.edges!.push(edge);
  }

  const laid = await elk.layout(root);

  const abs = new Map<string, { x: number; y: number }>([["root", { x: 0, y: 0 }]]);
  const nodes: FlowNode[] = [];
  const boundaryIds = new Set(view.boundaries.map((b) => b.id));
  const walk = (n: ElkNode, ox: number, oy: number, parentId: string | undefined) => {
    for (const c of n.children ?? []) {
      const x = c.x ?? 0;
      const y = c.y ?? 0;
      abs.set(c.id, { x: ox + x, y: oy + y });
      const el = view.boundaries.find((b) => b.id === c.id) ?? view.nodes.find((v) => v.el.id === c.id)!.el;
      if (boundaryIds.has(c.id)) {
        nodes.push({
          id: c.id,
          type: "boundary",
          position: { x, y },
          parentId,
          width: c.width,
          height: c.height,
          selectable: false,
          zIndex: 0,
          data: { el, isFocus: c.id === view.focus, open: view.open.has(c.id) },
        });
        walk(c, ox + x, oy + y, c.id);
      } else {
        nodes.push({
          id: c.id,
          type: "element",
          position: { x, y },
          parentId,
          width: c.width,
          height: c.height,
          zIndex: 2,
          data: { el, hasChildren: hasChildren(el) },
        });
      }
    }
  };
  walk(laid, 0, 0, undefined);

  const viewEdges = new Map(view.edges.map((e) => [e.id, e]));
  const edges: RelationFlowEdge[] = [];
  for (const le of (laid.edges ?? []) as (ElkExtendedEdge & { container?: string })[]) {
    const e = viewEdges.get(le.id);
    if (!e || !le.sections?.length) continue;
    const off = abs.get(le.container ?? "root") ?? { x: 0, y: 0 };
    const points = le.sections.flatMap((s, i) =>
      [...(i ? [] : [s.startPoint]), ...(s.bendPoints ?? []), s.endPoint].map((p) => ({ x: p.x + off.x, y: p.y + off.y })),
    );
    const L = le.labels?.[0];
    const [text, proto] = edgeText(e);
    edges.push({
      id: e.id,
      source: e.from,
      target: e.to,
      type: "relation",
      zIndex: 1,
      markerEnd: { type: MarkerType.ArrowClosed, color: STATUS_META[e.status].stroke, width: 18, height: 18 },
      data: {
        edge: e,
        points,
        text,
        proto,
        label: L ? { x: (L.x ?? 0) + off.x, y: (L.y ?? 0) + off.y, width: L.width ?? 0, height: L.height ?? 0 } : null,
      },
    });
  }
  return { nodes, edges };
}
