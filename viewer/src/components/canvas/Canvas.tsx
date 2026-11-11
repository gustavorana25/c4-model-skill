import { Background, BackgroundVariant, MiniMap, ReactFlow, useReactFlow, useViewport, type EdgeTypes, type NodeTypes } from "@xyflow/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Filter, Home, Maximize2, Minus, Plus, Route, Shrink, UnfoldVertical, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { hopLabel } from "../../lib/flow";
import type { Hop } from "../../lib/types";
import { computeDimmer, flowMarks } from "../../lib/highlight";
import { layoutView, type FlowNode, type RelationFlowEdge } from "../../lib/layout";
import { STATUS_META } from "../../lib/meta";
import { levelLabel } from "../../lib/notation";
import { ancestors, docHasChanges, statusOf, type Model } from "../../lib/model";
import type { ArchDoc } from "../../lib/types";
import { computeView } from "../../lib/view";
import { useLang, useT } from "../../i18n";
import { EMBED, EMBED_ZOOM } from "../../embed";
import { flowSteps, useStore } from "../../store";
import { cn, floating } from "../ui";
import { BoundaryNode } from "./BoundaryNode";
import { CommentComposer } from "./CommentComposer";
import { ElementNode } from "./ElementNode";
import { RelationEdge } from "./RelationEdge";

const nodeTypes: NodeTypes = { element: ElementNode, boundary: BoundaryNode };
const edgeTypes: EdgeTypes = { relation: RelationEdge };
// espaço para as barras flutuantes (breadcrumb/toolbar em cima, legenda/minimapa embaixo)
/** Abaixo disso o texto dos cards fica difícil de ler: um salto não afasta a câmera além disso. */
const MIN_READABLE_ZOOM = 0.85;
/** Zoom da câmera quando ela viaja de uma ponta à outra de um salto longo. */
const TRAVEL_ZOOM = 1;
const FIT_PADDING = { top: "84px", bottom: "72px", left: "32px", right: "32px" } as const;
/**
 * Enquadramento inicial. Precisa ser um objeto fixo: o React Flow copia esta prop para o store a cada
 * mudança de referência, e isso sobrescreve as opções de um rf.fitView() que ainda está na fila
 * (com saltos rápidos, a câmera enquadrava o diagrama inteiro em vez do salto).
 */
const INITIAL_FIT = {
  padding: FIT_PADDING,
  // no iframe com ?zoom=, a câmera não afasta além dele: centraliza e o leitor arrasta
  minZoom: EMBED_ZOOM,
  maxZoom: Math.max(1.2, EMBED_ZOOM ?? 0),
};

/** Só o que muda o tamanho/posição das caixas dispara um novo layout. */
/** Posição absoluta de cada caixa (o React Flow guarda posição relativa ao pai). */
function absolutePositions(nodes: FlowNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, { x: number; y: number }>();
  const get = (id: string): { x: number; y: number } => {
    const hit = out.get(id);
    if (hit) return hit;
    const n = byId.get(id)!;
    const p = n.parentId && byId.has(n.parentId) ? get(n.parentId) : { x: 0, y: 0 };
    const v = { x: p.x + n.position.x, y: p.y + n.position.y };
    out.set(id, v);
    return v;
  };
  nodes.forEach((n) => get(n.id));
  return out;
}

/** O idioma entra porque muda a largura dos rótulos de seta ("3 relações"). */
function layoutKey(doc: ArchDoc, focus: string | null, expanded: ReadonlySet<string>, lang: string) {
  const strip = (els: ArchDoc["elements"]): unknown =>
    els.map((e) => [e.id, e.name, e.tech, e.description, e.type, e.status, e.children ? strip(e.children) : 0]);
  return JSON.stringify([lang, focus, [...expanded].sort(), strip(doc.elements), doc.relations?.map((r) => [r.from, r.to, r.label, r.protocol, r.status])]);
}

export function Canvas() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  // documentação do sistema (ou plano sem mudanças): sem legenda nem filtros de mudança
  const changes = useMemo(() => docHasChanges(doc, model), [doc, model]);
  const focus = useStore((s) => s.focus);
  const selected = useStore((s) => s.selected);
  const pinnedStep = useStore((s) => s.pinnedStep);
  const onlyChanges = useStore((s) => s.onlyChanges);
  const select = useStore((s) => s.select);
  const commenting = useStore((s) => s.commenting);
  const commentTargets = useStore((s) => s.commentTargets);
  const toggleTarget = useStore((s) => s.toggleCommentTarget);
  const flow = useStore((s) => s.flow);
  const followFlow = useStore((s) => s.followFlow);
  const expanded = useStore((s) => s.expanded);
  const camera = useStore((s) => s.camera);
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const rf = useReactFlow();
  const t = useT();

  const view = useMemo(() => computeView(doc, model, focus, expanded), [doc, model, focus, expanded]);
  const lang = useLang((s) => s.lang);
  const key = layoutKey(doc, focus, expanded, lang);
  const [laid, setLaid] = useState<{ key: string; focus: string | null; nodes: FlowNode[]; edges: RelationFlowEdge[] } | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    layoutView(view, model.notation.direction, [...model.index.keys()])
      .then((r) => alive && (setLaid({ key, focus: view.focus, ...r }), setLayoutError(null)))
      .catch((e: Error) => alive && setLayoutError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Câmera: ao abrir/fechar, a caixa fica no mesmo lugar da tela; num salto de fluxo, o salto é
  // enquadrado. Espera o layout da view atual ficar pronto. As caixas deslizam até a posição nova (CSS).
  const curAbs = useRef(new Map<string, { x: number; y: number }>());
  const pending = useRef<{ cam: NonNullable<typeof camera>; before: Map<string, { x: number; y: number }> } | null>(null);
  const handled = useRef(0);
  const keyRef = useRef(key);
  keyRef.current = key;
  const [moving, setMoving] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const runCamera = () => {
    const p = pending.current;
    if (!p || !laid || laid.key !== keyRef.current) return;
    pending.current = null;
    const { cam, before } = p;
    if (cam.kind === "anchor") {
      travel.current++;
      const a = before.get(cam.ids[0]);
      const b = curAbs.current.get(cam.ids[0]);
      if (!a || !b) return;
      const vp = rf.getViewport();
      rf.setViewport({ x: vp.x - (b.x - a.x) * vp.zoom, y: vp.y - (b.y - a.y) * vp.zoom, zoom: vp.zoom }, { duration: 350 });
    } else {
      const ids = [...new Set(cam.ids.map(view.toVisible).filter((x): x is string => !!x))];
      const trip = ++travel.current;
      // espera o React Flow medir as caixas novas: enquadrar antes disso cai no diagrama inteiro
      const measured = () => ids.every((id) => !!rf.getInternalNode(id)?.measured.width);
      let tries = 0;
      const go = () => {
        if (trip !== travel.current) return;
        if (!measured()) {
          if (++tries < 20) setTimeout(go, 50);
          return;
        }
        const box = wrap.current?.getBoundingClientRect();
        const b = rf.getNodesBounds(ids);
        const zoom = box ? Math.min(box.width / (b.width * 1.7), box.height / (b.height * 1.7)) : 1;
        if (cam.kind !== "hop" || ids.length < 2 || zoom >= MIN_READABLE_ZOOM) {
          rf.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.35, maxZoom: 1.1, duration: 400 });
          return;
        }
        // as duas pontas não cabem legíveis: viaja da origem ao destino sem afastar a câmera
        void travelHop(ids[0], ids[1], trip);
      };
      setTimeout(go, 60);
    }
  };
  const travel = useRef(0);
  const centerOf = (id: string) => {
    const n = rf.getInternalNode(id);
    if (!n) return null;
    const p = n.internals.positionAbsolute;
    return { x: p.x + (n.measured.width ?? 0) / 2, y: p.y + (n.measured.height ?? 0) / 2 };
  };
  const travelHop = async (from: string, to: string, trip: number) => {
    const a = centerOf(from);
    const b = centerOf(to);
    if (!a || !b) return;
    const vp = rf.getViewport();
    const box = wrap.current?.getBoundingClientRect();
    // 1. a origem na tela, em zoom de leitura (pula se já está)
    const onScreen = box && vp.zoom >= TRAVEL_ZOOM * 0.9 && vp.zoom <= TRAVEL_ZOOM * 1.2 &&
      Math.abs(a.x * vp.zoom + vp.x - box.width / 2) < box.width / 2 - 120 &&
      Math.abs(a.y * vp.zoom + vp.y - box.height / 2) < box.height / 2 - 100;
    if (!onScreen) {
      await rf.setCenter(a.x, a.y, { zoom: TRAVEL_ZOOM, duration: 350 });
      if (trip !== travel.current) return;
      await new Promise((r) => setTimeout(r, 120));
      if (trip !== travel.current) return;
    }
    // 2. desliza até o destino no mesmo zoom; mais longe, mais tempo (até 1 s)
    const zoom = onScreen ? vp.zoom : TRAVEL_ZOOM;
    const px = Math.hypot(b.x - a.x, b.y - a.y) * zoom;
    await rf.setCenter(b.x, b.y, { zoom, duration: Math.min(1000, Math.max(450, px / 1.6)) });
  };
  useEffect(() => {
    if (!camera || camera.at <= handled.current) return;
    handled.current = camera.at;
    pending.current = { cam: camera, before: curAbs.current };
    runCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);
  useEffect(() => {
    if (!laid) return;
    const first = curAbs.current.size === 0;
    curAbs.current = absolutePositions(laid.nodes);
    if (!first) {
      setMoving(true);
      setTimeout(() => setMoving(false), 380);
    }
    runCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laid]);

  // passo atual do fluxo: com as caixas fechadas, saltos seguidos no mesmo card são um passo só
  const step = useMemo(() => {
    const steps = flowSteps({ doc, model, flow, followFlow, focus, expanded });
    if (!steps || !flow) return null;
    const k = Math.max(0, steps.findIndex(([a, b]) => flow.hop >= a && flow.hop <= b));
    return { k, n: steps.length, range: steps[k] };
  }, [doc, model, flow, followFlow, focus, expanded]);
  const marks = useMemo(
    () => (flow ? flowMarks(doc, view, flow.id, flow.hop, step?.range[0]) : null),
    [doc, view, flow, step],
  );
  const dimmer = useMemo(
    () => computeDimmer(doc, model, view, pinnedStep, onlyChanges, marks),
    [doc, model, view, pinnedStep, onlyChanges, marks],
  );

  const nodes = useMemo(
    () =>
      (laid?.nodes ?? []).map((n): FlowNode => {
        const el = model.index.get(n.id) ?? n.data.el;
        if (n.type === "boundary") return { ...n, data: { ...n.data, el } };
        return { ...n, className: EMBED && n.data.hasChildren ? "can-open" : undefined, data: { ...n.data, el, dim: dimmer.node(n.id), selected: selected?.kind === "el" && selected.id === n.id, commentTarget: commentTargets.includes(n.id), flowActive: !!marks?.activeNodes.has(n.id) } };
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
    <div ref={wrap} className={cn("relative h-full w-full", commenting && "commenting", moving && "relayout")}>
      {/* remonta a cada nível: o fitView inicial do React Flow enquadra depois de medir os nós */}
      <ReactFlow
        key={laid ? (laid.focus ?? "__root") : "__loading"}
        fitView
        fitViewOptions={INITIAL_FIT}
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
        // no iframe não há painel de detalhes: um clique no card abre ou fecha o nível de dentro
        onNodeClick={(_, n) => n.type === "element" && (EMBED ? n.data.hasChildren && toggleExpanded(n.id) : commenting ? toggleTarget(n.id) : select({ kind: "el", id: n.id }))}
        onNodeDoubleClick={EMBED ? undefined : (_, n) => n.type === "element" && n.data.hasChildren && toggleExpanded(n.id)}
        onEdgeClick={EMBED ? undefined : (_, e) => !commenting && select({ kind: "edge", id: e.id })}
        onPaneClick={EMBED ? undefined : () => !commenting && select(null)}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#1F2736" bgColor="#0B0F16" />
        {!EMBED && <MiniMap
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
        />}
      </ReactFlow>
      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap items-start justify-between gap-2 [&>*]:pointer-events-auto">
        {/* no iframe, o caminho só aparece quando o link abre num nível de dentro (~id) */}
        {(!EMBED || focus) && <Breadcrumbs model={model} focus={focus} />}
        <Toolbar changes={changes} />
      </div>
      {changes && <Legend />}
      {!EMBED && (
        <>
          <CommentComposer />
          <StepBanner />
          <FlowBanner insideNode={marks?.insideNode ?? null} step={step} />
          <HopChips toVisible={view.toVisible} wrap={wrap} />
        </>
      )}
      {(layoutError || model.problems.length > 0) && (
        <div className="absolute inset-x-4 top-20 z-10 max-h-40 overflow-auto rounded-xl border border-[rgba(242,104,95,.35)] bg-[rgba(242,104,95,.1)] px-4 py-3 text-[13px] text-[#FFC9C4]">
          <b>{t("canvas.problems")}</b>
          <ul className="mt-1 list-disc pl-5">
            {layoutError && <li>{t("canvas.layoutError", layoutError)}</li>}
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
  const openCount = useStore((s) => s.expanded.size);
  const t = useT();
  return (
    <nav aria-label={t("canvas.level")} className={cn(floating, "flex min-w-0 flex-wrap items-center gap-1 p-1 text-[13px]")}>
      <button
        type="button"
        onClick={() => setFocus(null)}
        className={cn(
          "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 transition",
          chain.length ? "text-muted hover:bg-hover hover:text-fg" : "bg-hover font-semibold text-fg",
        )}
      >
        <Home size={14} /> {t("canvas.overview")}
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
        {!focus && openCount ? t("canvas.openBoxes", openCount) : levelLabel(model.notation, focusType)}
      </span>
    </nav>
  );
}

function Toolbar({ changes }: { changes: boolean }) {
  const rf = useReactFlow();
  const onlyChanges = useStore((s) => s.onlyChanges);
  const toggle = useStore((s) => s.toggleOnlyChanges);
  const expandChanged = useStore((s) => s.expandChanged);
  const collapseAll = useStore((s) => s.collapseAll);
  const t = useT();
  const btn = "flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-2 transition hover:bg-hover hover:text-fg";
  return (
    <div className={cn(floating, "ml-auto flex items-center gap-1 p-1")}>
      {changes && (
        <>
      {!EMBED && (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={onlyChanges}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition",
          onlyChanges ? "bg-accent-bg text-accent-ink" : "text-fg-2 hover:bg-hover",
        )}
        title={t("canvas.onlyChangesTitle")}
      >
        <Filter size={14} /> {t("canvas.onlyChanges")}
      </button>
      )}
      <button type="button" className={btn} onClick={expandChanged} title={t("canvas.expandChanged")} aria-label={t("canvas.expandChanged")}>
        <UnfoldVertical size={16} />
      </button>
        </>
      )}
      <button type="button" className={btn} onClick={collapseAll} title={t("canvas.collapseAll")} aria-label={t("canvas.collapseAll")}>
        <Shrink size={15} />
      </button>
      <span className="mx-1 h-5 w-px bg-line-strong" />
      <button type="button" className={btn} onClick={() => rf.zoomOut({ duration: 200 })} aria-label={t("canvas.zoomOut")}>
        <Minus size={16} />
      </button>
      <button type="button" className={btn} onClick={() => rf.zoomIn({ duration: 200 })} aria-label={t("canvas.zoomIn")}>
        <Plus size={16} />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => rf.fitView({ ...INITIAL_FIT, duration: 300 })}
        aria-label={t("canvas.fit")}
      >
        <Maximize2 size={15} />
      </button>
    </div>
  );
}

function Legend() {
  const t = useT();
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
          {t(`status.${k}`)}
        </span>
      ))}
    </div>
  );
}

function FlowBanner({ insideNode, step }: { insideNode: string | null; step: { k: number; n: number; range: [number, number] } | null }) {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const flow = useStore((s) => s.flow);
  const stepHop = useStore((s) => s.stepHop);
  const openFlow = useStore((s) => s.openFlow);
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const t = useT();
  // a descrição quebra em várias linhas, então a altura muda: o chip "de/para" de cima fica logo abaixo
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const measure = () => host.style.setProperty("--flow-banner-bottom", `${el.offsetTop + el.offsetHeight}px`);
    measure(); // a cada salto; o observer cobre mudanças de largura da tela
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      host.style.removeProperty("--flow-banner-bottom");
    };
  }, [flow?.id, flow?.hop, step?.range[0]]);
  const fl = flow && doc.flows?.find((f) => f.id === flow.id);
  if (!fl || !flow || !step) return null;
  const hops: Hop[] = fl.hops.slice(step.range[0], step.range[1] + 1);
  const name = (id: string) => model.index.get(id)?.name ?? id;
  const btn = "flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:cursor-default disabled:opacity-40";
  return (
    <div ref={box} className="absolute left-1/2 top-[72px] z-10 flex w-[min(640px,calc(100%-32px))] -translate-x-1/2 flex-col gap-1 rounded-2xl bg-accent px-3 py-2 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,.45)]">
      <div className="flex items-center gap-2">
        <Route size={14} className="shrink-0" />
        <b className="min-w-0 truncate">{fl.title}</b>
        <span className="shrink-0 tabular-nums text-white/75">
          {step.k + 1}/{step.n}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <button type="button" className={btn} disabled={step.k === 0} onClick={() => stepHop(-1)} aria-label={t("canvas.prevHop")}>
            <ChevronLeft size={15} />
          </button>
          <button type="button" className={btn} disabled={step.k === step.n - 1} onClick={() => stepHop(1)} aria-label={t("canvas.nextHop")}>
            <ChevronRight size={15} />
          </button>
          <button type="button" className={btn} onClick={() => openFlow(null)} aria-label={t("canvas.closeFlow")}>
            <X size={14} />
          </button>
        </span>
      </div>
      {/* a relação numa linha; a descrição embaixo, quebrando em quantas linhas precisar */}
      {/* cada salto do passo: a relação numa linha, a descrição embaixo, quebrando em quantas linhas precisar */}
      <ol className={cn("flex flex-col gap-1.5", hops.length > 2 && "-mr-2 max-h-[140px] overflow-y-auto pr-2")}>
        {hops.map((h, i) => {
          const label = hopLabel(doc, h);
          return (
            <li key={i} className="flex min-w-0 gap-2 pl-[22px]">
              {hops.length > 1 && <span className="shrink-0 pt-px tabular-nums text-white/65">{step.range[0] + i + 1}.</span>}
              <span className="min-w-0">
                <span className="block font-semibold">
                  {name(h.from)} → {name(h.to)}
                </span>
                {label && <span className="block break-words leading-[18px] text-white/85">{label}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {insideNode && (
        <div className="pl-[22px] text-[12px] text-white/80">
          {t("canvas.insideNode")} <b>{name(insideNode)}</b>.{" "}
          <button type="button" className="cursor-pointer underline" onClick={() => toggleExpanded(insideNode)}>
            {t("canvas.open")}
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
  const t = useT();
  const idx = doc.steps?.findIndex((s) => s.id === pinned) ?? -1;
  if (idx < 0) return null;
  return (
    <div className="absolute left-1/2 top-[72px] z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-accent py-1.5 pl-4 pr-1.5 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,.45)]">
      <b>{t("canvas.step", idx + 1)}</b>
      <span className="max-w-[44ch] truncate text-white/85">{doc.steps![idx].title}</span>
      <button
        type="button"
        onClick={() => pin(null)}
        className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
        aria-label={t("canvas.clearStep")}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Ponta do salto fora da tela: um chip na borda diz onde ela está e leva a câmera até lá. */
function HopChips({ toVisible, wrap }: { toVisible: (id: string) => string | null; wrap: RefObject<HTMLDivElement | null> }) {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const flow = useStore((s) => s.flow);
  const rf = useReactFlow();
  const vp = useViewport();
  const t = useT();
  const box = wrap.current?.getBoundingClientRect();
  const h = flow && doc.flows?.find((f) => f.id === flow.id)?.hops[flow.hop];
  if (!h || !box) return null;
  const ends = [
    { id: toVisible(h.from), prefix: t("canvas.hopFrom"), name: model.index.get(h.from)?.name ?? h.from },
    { id: toVisible(h.to), prefix: t("canvas.hopTo"), name: model.index.get(h.to)?.name ?? h.to },
  ];
  if (!ends[0].id || ends[0].id === ends[1].id) return null;
  return (
    <>
      {ends.map((e) => {
        const n = e.id && rf.getInternalNode(e.id);
        if (!n) return null;
        const p = n.internals.positionAbsolute;
        const w = n.measured.width ?? 0;
        const hh = n.measured.height ?? 0;
        const sx = p.x * vp.zoom + vp.x;
        const sy = p.y * vp.zoom + vp.y;
        const right = sx > box.width;
        const left = sx + w * vp.zoom < 0;
        const below = sy > box.height;
        const above = sy + hh * vp.zoom < 0;
        if (!left && !right && !above && !below) return null;
        const Icon = left ? ArrowLeft : right ? ArrowRight : above ? ArrowUp : ArrowDown;
        const pos = left
          ? "left-4 top-1/2 -translate-y-1/2"
          : right
            ? "right-4 top-1/2 -translate-y-1/2 flex-row-reverse"
            : above
              ? "left-1/2 top-[calc(var(--flow-banner-bottom,138px)+12px)] -translate-x-1/2"
              : "bottom-20 left-1/2 -translate-x-1/2";
        return (
          <button
            key={e.prefix}
            type="button"
            onClick={() => rf.setCenter(p.x + w / 2, p.y + hh / 2, { zoom: Math.max(vp.zoom, MIN_READABLE_ZOOM), duration: 600 })}
            className={cn(floating, "absolute z-10 flex max-w-[260px] cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[12px] text-fg-2 transition hover:text-fg", pos)}
            title={t("canvas.goTo", e.name)}
          >
            <Icon size={13} className="shrink-0 text-accent-ink" />
            <span className="min-w-0 truncate">
              {e.prefix} <b className="font-semibold text-fg">{e.name}</b>
            </span>
          </button>
        );
      })}
    </>
  );
}
