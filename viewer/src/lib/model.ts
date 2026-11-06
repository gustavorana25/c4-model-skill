import type { ArchDoc, ArchElement, Status } from "./types";

export interface Model {
  index: Map<string, ArchElement>;
  parent: Map<string, string | null>;
  problems: string[];
}

/** Valida o mínimo para não quebrar a renderização. A validação completa é do script Python. */
export function parseDoc(raw: unknown): ArchDoc {
  if (!raw || typeof raw !== "object") throw new Error("O documento precisa ser um objeto.");
  const d = raw as Partial<ArchDoc>;
  if (!Array.isArray(d.elements)) throw new Error('Documento inválido: falta a lista "elements".');
  if (typeof d.plan !== "string") throw new Error('Documento inválido: falta "plan".');
  return d as ArchDoc;
}

export function buildModel(doc: ArchDoc): Model {
  const index = new Map<string, ArchElement>();
  const parent = new Map<string, string | null>();
  const problems: string[] = [];
  const walk = (items: ArchElement[] | undefined, p: ArchElement | null) => {
    for (const el of items ?? []) {
      if (!el?.id) {
        problems.push("Elemento sem id.");
        continue;
      }
      if (index.has(el.id)) problems.push(`id duplicado: ${el.id}`);
      index.set(el.id, el);
      parent.set(el.id, p?.id ?? null);
      walk(el.children, el);
    }
  };
  walk(doc.elements, null);
  if (doc.version !== 1) problems.push(`version esperada: 1 (recebido: ${String(doc.version)})`);
  for (const r of doc.relations ?? [])
    for (const end of [r.from, r.to])
      if (!index.has(end)) problems.push(`relação ${r.from} → ${r.to}: "${end}" não existe`);
  for (const s of doc.steps ?? [])
    for (const t of s.touches ?? []) if (!index.has(t)) problems.push(`passo ${s.id}: "${t}" não existe`);
  for (const f of doc.flows ?? [])
    (f.hops ?? []).forEach((h, i) => {
      for (const end of [h.from, h.to]) if (!index.has(end)) problems.push(`fluxo ${f.id}, salto ${i + 1}: "${end}" não existe`);
    });
  return { index, parent, problems };
}

export const statusOf = (x: { status?: Status }): Status => x.status ?? "unchanged";
export const implementable = (el: ArchElement) => !["person", "external", "system"].includes(el.type);
export const hasChildren = (el: ArchElement) => (el.children?.length ?? 0) > 0;

/** Do pai até a raiz. */
export function ancestors(m: Model, id: string): string[] {
  const out: string[] = [];
  let p = m.parent.get(id) ?? null;
  while (p) {
    out.push(p);
    p = m.parent.get(p) ?? null;
  }
  return out;
}

export const isWithin = (m: Model, id: string, anc: string) => id === anc || ancestors(m, id).includes(anc);

export function descendants(el: ArchElement): string[] {
  const out: string[] = [];
  const walk = (e: ArchElement) => e.children?.forEach((c) => (out.push(c.id), walk(c)));
  walk(el);
  return out;
}

/** O elemento ou algum descendente é tocado pelo plano. */
export function hasChanges(el: ArchElement): boolean {
  return statusOf(el) !== "unchanged" || (el.children ?? []).some(hasChanges);
}

/** Em qual view o elemento aparece como caixa. */
export function focusFor(m: Model, id: string): string | null {
  return m.parent.get(id) ?? null;
}
