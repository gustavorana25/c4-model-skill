import { create } from "zustand";
import { buildModel, focusFor, hasChildren, parseDoc, type Model } from "./lib/model";
import type { ArchDoc } from "./lib/types";

export type Selection = { kind: "el" | "edge"; id: string } | null;
export type SideTab = "review" | "steps";

interface State {
  doc: ArchDoc | null;
  model: Model | null;
  focus: string | null;
  selected: Selection;
  pinnedStep: string | null;
  onlyChanges: boolean;
  tab: SideTab;
  loadError: string | null;
  toast: { msg: string; at: number; tone: "ok" | "warn" } | null;
  /** Um agente está chamando window.c4plan.next() agora. */
  listening: boolean;
  /** Algum agente já escutou esta página (para mostrar "não está escutando" só quando faz sentido). */
  everListened: boolean;
  /** Modo comentário: cliques nos cards escolhem sobre o que é o comentário. */
  commenting: boolean;
  commentTargets: string[];

  load: (raw: unknown, focus?: string | null) => void;
  setListening: (on: boolean) => void;
  /** Abre (com os alvos dados, ou o elemento selecionado) ou fecha o modo comentário. */
  setCommenting: (on: boolean, targets?: string[]) => void;
  toggleCommentTarget: (id: string) => void;
  clear: (error?: string | null) => void;
  setFocus: (id: string | null) => void;
  goto: (id: string) => void;
  select: (sel: Selection) => void;
  pinStep: (id: string | null) => void;
  setTab: (tab: SideTab) => void;
  toggleOnlyChanges: () => void;
  notify: (msg: string, tone?: "ok" | "warn") => void;
}

export const useStore = create<State>((set, get) => ({
  doc: null,
  model: null,
  focus: null,
  selected: null,
  pinnedStep: null,
  onlyChanges: false,
  tab: "review",
  loadError: null,
  toast: null,
  listening: false,
  everListened: false,
  commenting: false,
  commentTargets: [],

  setListening: (on) => set((s) => (s.listening === on ? s : { listening: on, everListened: s.everListened || on })),
  setCommenting: (on, targets) =>
    set((s) => {
      if (!on) return { commenting: false, commentTargets: [] };
      const sel = s.selected?.kind === "el" ? [s.selected.id] : [];
      return { commenting: true, commentTargets: targets ?? (s.commenting ? s.commentTargets : sel) };
    }),
  toggleCommentTarget: (id) =>
    set((s) => ({
      commentTargets: s.commentTargets.includes(id) ? s.commentTargets.filter((t) => t !== id) : [...s.commentTargets, id],
    })),

  load: (raw, focus = null) => {
    const doc = parseDoc(raw);
    const model = buildModel(doc);
    const f = focus && model.index.has(focus) && hasChildren(model.index.get(focus)!) ? focus : null;
    // comentário em andamento sobrevive a uma versão nova do plano (o agente chama load()), sem alvos que sumiram
    const commentTargets = get().commentTargets.filter((t) => model.index.has(t));
    set({ doc, model, focus: f, selected: null, pinnedStep: null, loadError: null, commentTargets });
  },
  clear: (error = null) => set({ doc: null, model: null, focus: null, selected: null, loadError: error }),
  setFocus: (id) => set({ focus: id, selected: null }),
  goto: (id) => {
    const m = get().model;
    if (!m?.index.has(id)) return;
    set({ focus: focusFor(m, id), selected: { kind: "el", id }, tab: "review" });
  },
  select: (sel) => set(sel ? { selected: sel, tab: "review" } : { selected: null }),
  pinStep: (id) => set({ pinnedStep: id }),
  setTab: (tab) => set({ tab }),
  toggleOnlyChanges: () => set((s) => ({ onlyChanges: !s.onlyChanges })),
  notify: (msg, tone = "ok") => set({ toast: { msg, at: Date.now(), tone } }),
}));
