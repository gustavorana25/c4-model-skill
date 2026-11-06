import { dump } from "js-yaml";
import { useEffect } from "react";
import { buildHash, decodeHash, encodeDoc } from "./lib/codec";
import { useStore } from "./store";

let lastWritten = "";

/** Grava o estado atual (doc + view) no hash, sem criar entrada no histórico. */
export async function flushHash() {
  const { doc, focus } = useStore.getState();
  if (!doc) return;
  const h = buildHash(await encodeDoc(doc), focus);
  lastWritten = h;
  history.replaceState(null, "", h);
}

async function loadFromHash() {
  const st = useStore.getState();
  if (location.hash === lastWritten && st.doc) return;
  if (!location.hash || location.hash === "#") return st.clear();
  try {
    const { doc, focus } = await decodeHash(location.hash);
    lastWritten = location.hash;
    st.load(doc, focus);
  } catch (e) {
    st.clear(`Não consegui abrir o plano deste link: ${(e as Error).message}`);
  }
}

export function useHashSync() {
  const doc = useStore((s) => s.doc);
  const focus = useStore((s) => s.focus);
  useEffect(() => {
    loadFromHash();
    window.addEventListener("hashchange", loadFromHash);
    return () => window.removeEventListener("hashchange", loadFromHash);
  }, []);
  useEffect(() => {
    if (!doc) return;
    const t = setTimeout(flushHash, 250);
    return () => clearTimeout(t);
  }, [doc, focus]);
}

export function useKeyboard() {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as Element | null)?.closest?.("input,textarea,[contenteditable]")) return;
      const s = useStore.getState();
      if (!s.doc) return;
      if (s.flow && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) {
        ev.preventDefault();
        s.setHop(s.flow.hop + (ev.key === "ArrowRight" ? 1 : -1));
        return;
      }
      if (ev.key === "Escape") {
        if (s.commenting) s.setCommenting(false);
        else if (s.flow) s.openFlow(null);
        else if (s.pinnedStep) s.pinStep(null);
        else s.select(null);
      } else if ((ev.key === "c" || ev.key === "C") && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        ev.preventDefault();
        s.setCommenting(!s.commenting);
      } else if (ev.key === "Backspace" && s.focus) {
        s.setFocus(s.model!.parent.get(s.focus) ?? null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export async function copyYaml() {
  const s = useStore.getState();
  if (!s.doc) return;
  await copyText(dump(s.doc, { noRefs: true }));
  s.notify("YAML copiado");
}
