import { create } from "zustand";
import { buildModel, focusFor, hasChildren, parseDoc, type Model } from "./lib/model";
import type { ArchDoc } from "./lib/types";

export type Selection = { kind: "el" | "edge"; id: string } | null;
export type SideTab = "review" | "steps" | "changes";

/** Pergunta ou pedido de mudança feito na página para o agente que está escutando. */
export interface Message {
  id: string;
  elementId: string;
  kind: "ask" | "change";
  text: string;
  at: number;
  reply?: string;
}

interface State {
  doc: ArchDoc | null;
  /** O documento como chegou no link: base para a aba "Alterações". */
  baseline: ArchDoc | null;
  model: Model | null;
  focus: string | null;
  selected: Selection;
  pinnedStep: string | null;
  onlyChanges: boolean;
  dirty: boolean;
  tab: SideTab;
  sendOpen: boolean;
  loadError: string | null;
  toast: { msg: string; at: number } | null;
  /** Um agente está chamando window.c4plan.next() agora. */
  listening: boolean;
  /** Algum agente já escutou esta página (para mostrar "não está escutando" só quando faz sentido). */
  everListened: boolean;
  messages: Message[];

  load: (raw: unknown, focus?: string | null) => void;
  setListening: (on: boolean) => void;
  addMessage: (m: Message) => void;
  replyMessage: (id: string, text: string) => boolean;
  clear: (error?: string | null) => void;
  setFocus: (id: string | null) => void;
  goto: (id: string) => void;
  select: (sel: Selection) => void;
  pinStep: (id: string | null) => void;
  setTab: (tab: SideTab) => void;
  toggleOnlyChanges: () => void;
  setSendOpen: (open: boolean) => void;
  /** Edita o documento (cópia) e marca como alterado. */
  edit: (fn: (doc: ArchDoc) => void) => void;
  markClean: () => void;
  notify: (msg: string) => void;
}

export const useStore = create<State>((set, get) => ({
  doc: null,
  baseline: null,
  model: null,
  focus: null,
  selected: null,
  pinnedStep: null,
  onlyChanges: false,
  dirty: false,
  tab: "review",
  sendOpen: false,
  loadError: null,
  toast: null,
  listening: false,
  everListened: false,
  messages: [],

  setListening: (on) => set((s) => (s.listening === on ? s : { listening: on, everListened: s.everListened || on })),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  replyMessage: (id, text) => {
    if (!get().messages.some((m) => m.id === id)) return false;
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, reply: text } : m)) }));
    return true;
  },

  load: (raw, focus = null) => {
    const doc = parseDoc(raw);
    const model = buildModel(doc);
    const f = focus && model.index.has(focus) && hasChildren(model.index.get(focus)!) ? focus : null;
    set({ doc, baseline: structuredClone(doc), model, focus: f, selected: null, pinnedStep: null, dirty: false, loadError: null, sendOpen: false });
  },
  clear: (error = null) => set({ doc: null, baseline: null, model: null, focus: null, selected: null, loadError: error }),
  setFocus: (id) => set({ focus: id, selected: null }),
  goto: (id) => {
    const m = get().model;
    if (!m?.index.has(id)) return;
    set({ focus: focusFor(m, id), selected: { kind: "el", id }, tab: "review", sendOpen: false });
  },
  select: (sel) => set(sel ? { selected: sel, tab: "review" } : { selected: null }),
  pinStep: (id) => set({ pinnedStep: id }),
  setTab: (tab) => set({ tab }),
  toggleOnlyChanges: () => set((s) => ({ onlyChanges: !s.onlyChanges })),
  setSendOpen: (sendOpen) => set({ sendOpen }),
  edit: (fn) => {
    const cur = get().doc;
    if (!cur) return;
    const doc = structuredClone(cur);
    fn(doc);
    set({ doc, model: buildModel(doc), dirty: true });
  },
  markClean: () => set({ dirty: false }),
  notify: (msg) => set({ toast: { msg, at: Date.now() } }),
}));
