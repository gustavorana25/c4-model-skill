import { implementable, statusOf, type Model } from "./model";
import type { ArchDoc, ArchElement, Detail } from "./types";

export type Change =
  | { id: string; name: string; kind: "detail"; from?: Detail; to?: Detail }
  | { id: string; name: string; kind: "constraint-add" | "constraint-del"; text: string }
  | { id: string; name: string; kind: "notes"; from?: string; to?: string };

function flatten(doc: ArchDoc): Map<string, ArchElement> {
  const out = new Map<string, ArchElement>();
  const walk = (els: ArchElement[] | undefined) => els?.forEach((e) => (out.set(e.id, e), walk(e.children)));
  walk(doc.elements);
  return out;
}

/** O que o humano mudou desde que o link chegou (liberdade, restrições, notas). */
export function diffDocs(base: ArchDoc, cur: ArchDoc): Change[] {
  const before = flatten(base);
  const changes: Change[] = [];
  for (const el of flatten(cur).values()) {
    const old = before.get(el.id);
    if (!old) continue;
    const name = el.name;
    if (old.detail !== el.detail) changes.push({ id: el.id, name, kind: "detail", from: old.detail, to: el.detail });
    const a = old.constraints ?? [];
    const b = el.constraints ?? [];
    for (const c of b) if (!a.includes(c)) changes.push({ id: el.id, name, kind: "constraint-add", text: c });
    for (const c of a) if (!b.includes(c)) changes.push({ id: el.id, name, kind: "constraint-del", text: c });
    if ((old.notes ?? "").trim() !== (el.notes ?? "").trim())
      changes.push({ id: el.id, name, kind: "notes", from: old.notes, to: el.notes });
  }
  return changes;
}

/** Elementos que o plano cria/altera e que a IA vai implementar: são os que o humano precisa revisar. */
export function reviewables(m: Model): ArchElement[] {
  return [...m.index.values()].filter((e) => implementable(e) && ["new", "changed"].includes(statusOf(e)));
}
