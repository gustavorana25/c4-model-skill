/**
 * Ponte com o agente que roda o viewer no navegador embutido (Claude Code, Cursor...).
 *
 * O agente não recebe eventos da página: ele PUXA. Fica num loop chamando
 *   await window.c4plan.next(30000)
 * que só retorna quando o humano faz algo que precisa da IA (ou quando o tempo acaba).
 * Enquanto houver chamadas recentes, a página mostra "IA escutando".
 */
import { flushHash } from "./hooks";
import { diffDocs, reviewables } from "./lib/diff";
import { useStore, type Message } from "./store";

export type BridgeEvent =
  | { event: "ask" | "change"; messageId: string; elementId: string; elementName: string; text: string; at: number }
  | { event: "send"; approved: boolean; changes: number; url: string; at: number };

/** Limite de uma chamada do agente: a ferramenta de JS do navegador corta em ~45s. */
export const MAX_WAIT_MS = 40_000;
/** Sem novo next() por este tempo depois do último retorno, consideramos que o agente parou. */
export const GRACE_MS = 45_000;

const queue: BridgeEvent[] = [];
let waiter: ((ev: BridgeEvent | null) => void) | null = null;
let lastPoll = 0;
let stopped = false;

const now = () => Date.now();

function refreshListening() {
  const on = !stopped && (waiter !== null || (lastPoll > 0 && now() - lastPoll < GRACE_MS));
  useStore.getState().setListening(on);
}

/** Coloca um evento para o agente. Também vai para o console, para ferramentas que só leem logs. */
export function emit(ev: BridgeEvent) {
  console.info("[c4plan]", JSON.stringify(ev));
  if (waiter) {
    const w = waiter;
    waiter = null;
    w(ev);
  } else {
    queue.push(ev);
  }
  refreshListening();
}

export function next(timeoutMs = 30_000): Promise<BridgeEvent | null> {
  stopped = false;
  lastPoll = now();
  const queued = queue.shift();
  if (queued) {
    refreshListening();
    return Promise.resolve(queued);
  }
  if (waiter) waiter(null); // só um agente espera por vez
  const wait = Math.max(0, Math.min(timeoutMs, MAX_WAIT_MS));
  return new Promise((resolve) => {
    const done = (ev: BridgeEvent | null) => {
      clearTimeout(timer);
      if (waiter === done) waiter = null;
      lastPoll = now();
      refreshListening();
      resolve(ev);
    };
    const timer = setTimeout(() => done(null), wait);
    waiter = done;
    refreshListening();
  });
}

/** O agente avisa que parou de escutar (fim da janela, ou vai seguir com o plano). */
export function stop() {
  stopped = true;
  lastPoll = 0;
  if (waiter) waiter(null);
  refreshListening();
}

let seq = 0;
export function ask(kind: "ask" | "change", elementId: string, text: string): Message {
  const s = useStore.getState();
  const msg: Message = { id: `m${now().toString(36)}${(seq++).toString(36)}`, elementId, kind, text, at: now() };
  s.addMessage(msg);
  emit({ event: kind, messageId: msg.id, elementId, elementName: s.model?.index.get(elementId)?.name ?? elementId, text, at: msg.at });
  return msg;
}

export async function sendToAgent() {
  await flushHash();
  const s = useStore.getState();
  const changes = s.doc && s.baseline ? diffDocs(s.baseline, s.doc).length : 0;
  emit({ event: "send", approved: !!s.doc?.approved, changes, url: location.href, at: now() });
  s.markClean();
}

/** Estado atual, pronto para o agente decidir o que fazer. */
export async function state() {
  await flushHash();
  const s = useStore.getState();
  if (!s.doc || !s.model) return { loaded: false as const };
  const sel = s.selected;
  const el = sel?.kind === "el" ? s.model.index.get(sel.id) : undefined;
  return {
    loaded: true as const,
    url: location.href,
    plan: s.doc.plan,
    approved: !!s.doc.approved,
    dirty: s.dirty,
    focus: s.focus,
    selected: sel ? { kind: sel.kind, id: sel.id, name: el?.name ?? null } : null,
    pinnedStep: s.pinnedStep,
    changes: s.baseline ? diffDocs(s.baseline, s.doc) : [],
    pendingReview: reviewables(s.model).filter((e) => !e.reviewed).map((e) => e.id),
    openMessages: s.messages.filter((m) => !m.reply),
    doc: s.doc,
  };
}

/** Responde uma pergunta/pedido; a resposta aparece no painel do elemento. */
export function reply(messageId: string, text: string) {
  return useStore.getState().replyMessage(messageId, text);
}

/** Carrega uma versão nova do plano (URL completa ou só o "#v1...") sem perder a conversa. */
export function load(urlOrHash: string) {
  const h = urlOrHash.includes("#") ? urlOrHash.slice(urlOrHash.indexOf("#")) : `#${urlOrHash}`;
  location.hash = h;
  return true;
}

export function installBridge() {
  const api = { version: 1, next, state, reply, load, stop };
  Object.assign(window, { c4plan: api });
  setInterval(refreshListening, 2000);
}

/** Só para testes. */
export function _resetBridge() {
  queue.length = 0;
  waiter = null;
  lastPoll = 0;
  stopped = false;
}

declare global {
  interface Window {
    c4plan?: { version: number; next: typeof next; state: typeof state; reply: typeof reply; load: typeof load; stop: typeof stop };
  }
}
