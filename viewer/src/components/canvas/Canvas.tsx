import { Background, BackgroundVariant, MiniMap, ReactFlow, useReactFlow, type EdgeTypes, type NodeTypes } from "@xyflow/react";
import { ChevronLeft, ChevronRight, Filter, Home, Maximize2, Minus, Plus, Route, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hopLabel } from "../../lib/flow";
import { computeDimmer, flowMarks } from "../../lib/highlight";
import { layoutView, type FlowNode, type RelationFlowEdge } from "../../lib/layout";
import { DETAIL_META, STATUS_META, levelLabel } from "../../lib/meta";
import { ancestors, statusOf, type Model } from "../../lib/model";
import type { ArchDoc } from "../../lib/types";
import { computeView } from "../../lib/view";
import { useStore } from "../../store";
import { cn, floating } from "../ui";
import { BoundaryNode } from "./BoundaryNode";
import { CommentComposer } from "./CommentComposer";
import { ElementNode } from "./ElementNode";
import { RelationEdge } from "./RelationEdge";

const nodeTypes: NodeTypes = { element: ElementNode, boundary: BoundaryNode };
const edgeTypes: EdgeTypes = { relation: RelationEdge };
// espaço para as barras flutuantes (breadcrumb/toolbar em cima, legenda/minimapa embaixo)
const FIT_PADDING = { top: "84px", bottom: "72px", left: "32px", right: "32px" } as const;

/** Só o que muda o tamanho/posição das caixas dispara um novo layout. */
function layoutKey(doc: ArchDoc, focus: string | null) {
  const strip = (els: ArchDoc["elements"]): unknown =>
    els.map((e) => [e.id, e.name, e.tech, e.description, e.type, e.status, !!e.detail, e.children ? strip(e.children) : 0]);
  return JSON.stringify([focus, strip(doc.elements), doc.relations?.map((r) => [r.from, r.to, r.label, r.protocol, r.status])]);
}

export function Canvas() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const focus = useStore((s) => s.focus);
  const selected = useStore((s) => s.selected);
  const pinnedStep = useStore((s) => s.pinnedStep);
  const onlyChanges = useStore((s) => s.onlyChanges);
  const select = useStore((s) => s.select);
  const setFocus = useStore((s) => s.setFocus);
  const commenting = useStore((s) => s.commenting);
  const commentTargets = useStore((s) => s.commentTargets);
  const toggleTarget = useStore((s) => s.toggleCommentTarget);
  const flow = useStore((s) => s.flow);

  const view = useMemo(() => computeView(doc, model, focus), [doc, model, focus]);
  const key = layoutKey(doc, focus);
  const [laid, setLaid] = useState<{ focus: string | null; nodes: FlowNode[]; edges: RelationFlowEdge[] } | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    layoutView(view)
      .then((r) => alive && (setLaid({ focus: view.focus, ...r }), setLayoutError(null)))
      .catch((e: Error) => alive && setLayoutError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const marks = useMemo(() => (flow ? flowMarks(doc, view, flow.id, flow.hop) : null), [doc, view, flow]);
  const dimmer = useMemo(
    () => computeDimmer(doc, model, view, pinnedStep, onlyChanges, marks),
    [doc, model, view, pinnedStep, onlyChanges, marks],
  );

  const nodes = useMemo(
    () =>
      (laid?.nodes ?? []).map((n): FlowNode => {
        const el = model.index.get(n.id) ?? n.data.el;
        if (n.type === "boundary") return { ...n, data: { ...n.data, el } };
        return { ...n, data: { ...n.data, el, dim: dimmer.node(n.id), selected: selected?.kind === "el" && selected.id === n.id, commentTarget: commentTargets.includes(n.id), flowActive: !!marks?.activeNodes.has(n.id) } };
      }),
    [laid, model, dimmer, selected, commentTargets, marks],
  );
  const edges = useMemo(
    () =>
      (laid?.edges ?? []).map((e): RelationFlowEdge => {
        const ve = view.edges.find((v) => v.id === e.id) ?? e.data!.edge;
        return {
          ...e,
          data: {
            ...e.data!,
            edge: ve,
            dim: dimmer.edge(ve),
            selected: selected?.kind === "edge" && selected.id === e.id,
            flowNums: marks?.edgeNums.get(e.id),
            flowActive: !!marks?.activeEdges.has(e.id),
          },
        };
      }),
    [laid, view, dimmer, selected, marks],
  );

  return (
    <div className={cn("relative h-full w-full", commenting && "commenting")}>
      {/* remonta a cada nível: o fitView inicial do React Flow enquadra depois de medir os nós */}
      <ReactFlow
        key={laid ? (laid.focus ?? "__root") : "__loading"}
        fitView
        fitViewOptions={{ padding: FIT_PADDING, maxZoom: 1.2 }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        minZoom={0.1}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => n.type === "element" && (commenting ? toggleTarget(n.id) : select({ kind: "el", id: n.id }))}
        onNodeDoubleClick={(_, n) => n.type === "element" && n.data.hasChildren && setFocus(n.id)}
        onEdgeClick={(_, e) => !commenting && select({ kind: "edge", id: e.id })}
        onPaneClick={() => !commenting && select(null)}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#1F2736" bgColor="#0B0F16" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          bgColor="#111723"
          maskColor="rgba(11,15,22,.72)"
          maskStrokeColor="#33405A"
          className="!rounded-xl !border !border-[#222A39]"
          nodeColor={(n) =>
            n.type === "boundary" ? "rgba(44,53,71,.45)" : STATUS_META[statusOf((n.data as { el: { status?: never } }).el)].stroke
          }
          nodeBorderRadius={6}
        />
      </ReactFlow>
      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap items-start justify-between gap-2 [&>*]:pointer-events-auto">
        <Breadcrumbs model={model} focus={focus} />
        <Toolbar />
      </div>
      <Legend />
      <CommentComposer />
      <StepBanner />
      <FlowBanner insideNode={marks?.insideNode ?? null} />
      {(layoutError || model.problems.length > 0) && (
        <div className="absolute inset-x-4 top-20 z-10 max-h-40 overflow-auto rounded-xl border border-[rgba(242,104,95,.35)] bg-[rgba(242,104,95,.1)] px-4 py-3 text-[13px] text-[#FFC9C4]">
          <b>Problemas no documento</b>
          <ul className="mt-1 list-disc pl-5">
            {layoutError && <li>Layout: {layoutError}</li>}
            {model.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Breadcrumbs({ model, focus }: { model: Model; focus: string | null }) {
  const setFocus = useStore((s) => s.setFocus);
  const chain = focus ? [...ancestors(model, focus).reverse(), focus] : [];
  const focusType = focus ? model.index.get(focus)!.type : null;
  return (
    <nav aria-label="Nível" className={cn(floating, "flex min-w-0 flex-wrap items-center gap-1 p-1 text-[13px]")}>
      <button
        type="button"
        onClick={() => setFocus(null)}
        className={cn(
          "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 transition",
          chain.length ? "text-muted hover:bg-hover hover:text-fg" : "bg-hover font-semibold text-fg",
        )}
      >
        <Home size={14} /> Visão geral
      </button>
      {chain.map((id, i) => {
        const el = model.index.get(id)!;
        const last = i === chain.length - 1;
        return (
          <span key={id} className="flex min-w-0 items-center gap-1">
            <ChevronRight size={14} className="shrink-0 text-[#4A5366]" />
            <button
              type="button"
              onClick={() => !last && setFocus(id)}
              className={cn(
                "h-8 min-w-0 truncate rounded-lg px-2.5 transition",
                last ? "cursor-default bg-hover font-semibold text-fg" : "cursor-pointer text-muted hover:bg-hover hover:text-fg",
              )}
            >
              {el.name}
            </button>
          </span>
        );
      })}
      <span className="ml-1.5 mr-1 rounded-md bg-[#161D2A] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[.04em] text-muted">
        {levelLabel(focusType)}
      </span>
    </nav>
  );
}

function Toolbar() {
  const rf = useReactFlow();
  const onlyChanges = useStore((s) => s.onlyChanges);
  const toggle = useStore((s) => s.toggleOnlyChanges);
  const btn = "flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-2 transition hover:bg-hover hover:text-fg";
  return (
    <div className={cn(floating, "ml-auto flex items-center gap-1 p-1")}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={onlyChanges}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition",
          onlyChanges ? "bg-accent-bg text-accent-ink" : "text-fg-2 hover:bg-hover",
        )}
        title="Apagar o que o plano não toca"
      >
        <Filter size={14} /> Só mudanças
      </button>
      <span className="mx-1 h-5 w-px bg-line-strong" />
      <button type="button" className={btn} onClick={() => rf.zoomOut({ duration: 200 })} aria-label="Diminuir zoom">
        <Minus size={16} />
      </button>
      <button type="button" className={btn} onClick={() => rf.zoomIn({ duration: 200 })} aria-label="Aumentar zoom">
        <Plus size={16} />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => rf.fitView({ padding: FIT_PADDING, duration: 300, maxZoom: 1.2 })}
        aria-label="Ajustar à tela"
      >
        <Maximize2 size={15} />
      </button>
    </div>
  );
}

function Legend() {
  return (
    <div className={cn(floating, "absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 px-3.5 py-2 text-[12px] text-muted")}>
      {(["new", "changed", "removed"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <i
            className="inline-block size-2.5 rounded-[3px]"
            style={
              k === "removed"
                ? { border: `2px dashed ${STATUS_META[k].stroke}` }
                : { boxShadow: `0 0 0 2px ${STATUS_META[k].stroke}` }
            }
          />
          {STATUS_META[k].label}
        </span>
      ))}
      <span className="h-3.5 w-px bg-line-strong" />
      {Object.values(DETAIL_META).map((d) => (
        <span key={d.label} className="flex items-center gap-1" style={{ color: d.ink }} title={d.help}>
          <d.icon size={12} /> {d.label}
        </span>
      ))}
    </div>
  );
}

function FlowBanner({ insideNode }: { insideNode: string | null }) {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const flow = useStore((s) => s.flow);
  const setHop = useStore((s) => s.setHop);
  const openFlow = useStore((s) => s.openFlow);
  const setFocus = useStore((s) => s.setFocus);
  const fl = flow && doc.flows?.find((f) => f.id === flow.id);
  if (!fl || !flow) return null;
  const h = fl.hops[flow.hop];
  const name = (id: string) => model.index.get(id)?.name ?? id;
  const btn = "flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:cursor-default disabled:opacity-40";
  return (
    <div className="absolute left-1/2 top-[72px] z-10 flex w-[min(640px,calc(100%-32px))] -translate-x-1/2 flex-col gap-1 rounded-2xl bg-accent px-3 py-2 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,.45)]">
      <div className="flex items-center gap-2">
        <Route size={14} className="shrink-0" />
        <b className="min-w-0 truncate">{fl.title}</b>
        <span className="shrink-0 tabular-nums text-white/75">
          {flow.hop + 1}/{fl.hops.length}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <button type="button" className={btn} disabled={flow.hop === 0} onClick={() => setHop(flow.hop - 1)} aria-label="Salto anterior (←)">
            <ChevronLeft size={15} />
          </button>
          <button type="button" className={btn} disabled={flow.hop === fl.hops.length - 1} onClick={() => setHop(flow.hop + 1)} aria-label="Próximo salto (→)">
            <ChevronRight size={15} />
          </button>
          <button type="button" className={btn} onClick={() => openFlow(null)} aria-label="Fechar fluxo (Esc)">
            <X size={14} />
          </button>
        </span>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5 pl-[22px]">
        <span className="shrink-0 font-semibold">
          {name(h.from)} → {name(h.to)}
        </span>
        <span className="min-w-0 truncate text-white/85">{hopLabel(doc, h)}</span>
      </div>
      {insideNode && (
        <div className="pl-[22px] text-[12px] text-white/80">
          Acontece dentro de <b>{name(insideNode)}</b>.{" "}
          <button type="button" className="cursor-pointer underline" onClick={() => setFocus(insideNode)}>
            Abrir
          </button>
        </div>
      )}
    </div>
  );
}

function StepBanner() {
  const doc = useStore((s) => s.doc)!;
  const pinned = useStore((s) => s.pinnedStep);
  const pin = useStore((s) => s.pinStep);
  const idx = doc.steps?.findIndex((s) => s.id === pinned) ?? -1;
  if (idx < 0) return null;
  return (
    <div className="absolute left-1/2 top-[72px] z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-accent py-1.5 pl-4 pr-1.5 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,.45)]">
      <b>Passo {idx + 1}</b>
      <span className="max-w-[44ch] truncate text-white/85">{doc.steps![idx].title}</span>
      <button
        type="button"
        onClick={() => pin(null)}
        className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
        aria-label="Limpar destaque (Esc)"
      >
        <X size={14} />
      </button>
    </div>
  );
}
