/**
 * Ponte com o agente que roda o viewer no navegador embutido (Claude Code, Cursor...).
 *
 * O chat é a fonte da verdade. A página só serve de atalho para o humano apontar
 * elementos e comentar; a resposta acontece no chat. A única volta é o agente
 * carregar uma versão nova do plano com load(). A página não edita o plano.
 *
 * O agente não recebe eventos da página: ele PUXA. Fica num loop chamando
 *   await window.c4plan.next(30000)
 * que só retorna quando o humano faz algo que precisa da IA (ou quando o tempo acaba).
 * A escuta dura enquanto o humano mexer na página: cada interação zera o relógio de
 * inatividade. Depois de IDLE_MS parado, next() devolve {event:"stop"} e a escuta acaba.
 */
import { copyText, flushHash } from "./hooks";
import { titleOf } from "./lib/model";
import { useStore } from "./store";

export interface Target {
  id: string;
  name: string;
}

export type BridgeEvent =
  | { event: "comment"; targets: Target[]; view: string | null; text: string; at: number }
  | { event: "stop"; reason: "idle"; idleMs: number; at: number };

/** Limite de uma chamada do agente: a ferramenta de JS do navegador corta em ~45s. */
export const MAX_WAIT_MS = 40_000;
/** Sem novo next() por este tempo depois do último retorno, consideramos que o agente parou. */
export const GRACE_MS = 45_000;
/** Sem nenhuma interação do humano por este tempo, a escuta acaba. */
export const IDLE_MS = 10 * 60_000;

const queue: { ev: BridgeEvent; expire?: ReturnType<typeof setTimeout> }[] = [];
let waiter: ((ev: BridgeEvent | null) => void) | null = null;
let lastPoll = 0;
let lastActivity = Date.now();
let stopped = true;

const now = () => Date.now();

const isListening = () => !stopped && (waiter !== null || (lastPoll > 0 && now() - lastPoll < GRACE_MS));

function refreshListening() {
  useStore.getState().setListening(isListening());
}

/** O humano mexeu na página: a escuta continua. */
export function touch() {
  lastActivity = now();
}

export const idleMs = () => now() - lastActivity;

/** Coloca um evento para o agente. Também vai para o console, para ferramentas que só leem logs. */
export function emit(ev: BridgeEvent, onExpire?: () => void) {
  console.info("[c4plan]", JSON.stringify(ev));
  if (waiter) {
    const w = waiter;
    waiter = null;
    w(ev);
  } else {
    const item: (typeof queue)[number] = { ev };
    // Ninguém pegou a tempo: o agente provavelmente saiu do loop. Devolve para quem emitiu.
    if (onExpire)
      item.expire = setTimeout(() => {
        const i = queue.indexOf(item);
        if (i < 0) return;
        queue.splice(i, 1);
        onExpire();
      }, GRACE_MS);
    queue.push(item);
  }
  refreshListening();
}

export function next(timeoutMs = 30_000): Promise<BridgeEvent | null> {
  if (stopped) touch(); // começo de uma escuta: o humano ganha a janela inteira
  stopped = false;
  lastPoll = now();
  const queued = queue.shift();
  if (queued) {
    clearTimeout(queued.expire);
    refreshListening();
    return Promise.resolve(queued.ev);
  }
  if (waiter) waiter(null); // só um agente espera por vez
  const wait = Math.max(0, Math.min(timeoutMs, MAX_WAIT_MS, IDLE_MS - idleMs()));
  return new Promise((resolve) => {
    const done = (ev: BridgeEvent | null) => {
      clearTimeout(timer);
      if (waiter === done) waiter = null;
      lastPoll = now();
      refreshListening();
      resolve(ev);
    };
    const timer = setTimeout(() => {
      const idle = idleMs();
      if (idle >= IDLE_MS) {
        waiter = null;
        stop();
        resolve({ event: "stop", reason: "idle", idleMs: idle, at: now() });
      } else done(null);
    }, wait);
    waiter = done;
    refreshListening();
  });
}

/** O agente avisa que parou de escutar (vai seguir com o plano, ou o humano pediu). */
export function stop() {
  stopped = true;
  lastPoll = 0;
  const w = waiter;
  waiter = null;
  if (w) w(null);
  refreshListening();
}

/** Texto para colar no chat quando a página não consegue falar com a IA. */
export function commentText(targets: Target[], text: string) {
  if (!targets.length) return text;
  const refs = targets.map((t) => `"${t.name}" (${t.id})`);
  const list = refs.length > 1 ? `${refs.slice(0, -1).join(", ")} e ${refs.at(-1)}` : refs[0];
  return `Sobre ${list} no diagrama: ${text}`;
}

const NOT_SENT = "Não consegui falar com o chat. A mensagem está na área de transferência: cole no chat.";

/**
 * Manda um comentário sobre um ou mais elementos para o chat.
 * Sem IA escutando (ou se ela não pegar a tempo), copia o texto para o humano colar.
 */
export async function comment(targetIds: string[], text: string): Promise<"sent" | "copied"> {
  const s = useStore.getState();
  const targets = targetIds.map((id) => ({ id, name: s.model?.index.get(id)?.name ?? id }));
  const fallback = async () => {
    await copyText(commentText(targets, text));
    useStore.getState().notify(NOT_SENT, "warn");
  };
  if (!isListening()) {
    await fallback();
    return "copied";
  }
  emit({ event: "comment", targets, view: s.focus, text, at: now() }, fallback);
  return "sent";
}

/** Estado atual, pronto para o agente decidir o que fazer. */
export async function state() {
  await flushHash();
  const s = useStore.getState();
  if (!s.doc || !s.model) return { loaded: false as const, idleMs: idleMs() };
  const sel = s.selected;
  const el = sel?.kind === "el" ? s.model.index.get(sel.id) : undefined;
  return {
    loaded: true as const,
    url: location.href,
    plan: titleOf(s.doc),
    kind: s.doc.kind ?? "plan",
    focus: s.focus,
    selected: sel ? { kind: sel.kind, id: sel.id, name: el?.name ?? null } : null,
    /** Há quanto tempo o humano não mexe na página. Abaixo de IDLE_MS, vale voltar a escutar. */
    idleMs: idleMs(),
    pinnedStep: s.pinnedStep,
    doc: s.doc,
  };
}

/** Carrega uma versão nova do plano (URL completa ou só o "#v1...") sem recarregar a página. */
export function load(urlOrHash: string) {
  const h = urlOrHash.includes("#") ? urlOrHash.slice(urlOrHash.indexOf("#")) : `#${urlOrHash}`;
  location.hash = h;
  return true;
}

export function installBridge() {
  const api = { version: 3, next, state, load, stop };
  Object.assign(window, { c4plan: api });
  for (const t of ["pointerdown", "pointermove", "keydown", "wheel"]) window.addEventListener(t, touch, { passive: true, capture: true });
  setInterval(refreshListening, 2000);
}

/** Só para testes. */
export function _resetBridge() {
  for (const q of queue) clearTimeout(q.expire);
  queue.length = 0;
  waiter = null;
  lastPoll = 0;
  lastActivity = now();
  stopped = true;
}

declare global {
  interface Window {
    c4plan?: { version: number; next: typeof next; state: typeof state; load: typeof load; stop: typeof stop };
  }
}
