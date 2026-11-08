import { t, translate, type Lang } from "../i18n";
import { resolveNotation, typeMeta, type Notation } from "./notation";
import type { ArchDoc, ArchElement, Status } from "./types";

export interface Model {
  index: Map<string, ArchElement>;
  parent: Map<string, string | null>;
  problems: string[];
  /** Vocabulário do documento (tipo -> rótulo, ícone, cor, nível). */
  notation: Notation;
  /** Algum elemento ou relação muda (ver docHasChanges). */
  changes: boolean;
}

/** Valida o mínimo para não quebrar a renderização. A validação completa é do script Python. */
export function parseDoc(raw: unknown): ArchDoc {
  if (!raw || typeof raw !== "object") throw new Error(t("err.notObject"));
  const d = raw as Partial<ArchDoc>;
  if (!Array.isArray(d.elements)) throw new Error(t("err.noElements"));
  if (typeof d.title !== "string" && typeof d.plan !== "string") throw new Error(t("err.noTitle"));
  return d as ArchDoc;
}

/** lang: idioma dos problemas e dos rótulos da notação (pt-BR nos testes). */
export function buildModel(doc: ArchDoc, lang: Lang = "pt-BR"): Model {
  const index = new Map<string, ArchElement>();
  const parent = new Map<string, string | null>();
  const problems: string[] = [];
  const walk = (items: ArchElement[] | undefined, p: ArchElement | null) => {
    for (const el of items ?? []) {
      if (!el?.id) {
        problems.push(translate(lang, "prob.noId"));
        continue;
      }
      if (index.has(el.id)) problems.push(translate(lang, "prob.dupId", el.id));
      index.set(el.id, el);
      parent.set(el.id, p?.id ?? null);
      walk(el.children, el);
    }
  };
  walk(doc.elements, null);
  if (doc.version !== 1) problems.push(translate(lang, "prob.version", String(doc.version)));
  for (const r of doc.relations ?? [])
    for (const end of [r.from, r.to])
      if (!index.has(end)) problems.push(translate(lang, "prob.relation", r.from, r.to, end));
  for (const s of doc.steps ?? [])
    for (const t of s.touches ?? []) if (!index.has(t)) problems.push(translate(lang, "prob.step", s.id, t));
  for (const f of doc.flows ?? [])
    (f.hops ?? []).forEach((h, i) => {
      for (const end of [h.from, h.to]) if (!index.has(end)) problems.push(translate(lang, "prob.hop", f.id, i + 1, end));
    });
  const m = { index, parent, problems, notation: resolveNotation(doc, lang), changes: false };
  m.changes = docHasChanges(doc, m);
  return m;
}

export const titleOf = (doc: ArchDoc): string => doc.title ?? doc.plan ?? "";
/** Documentação do sistema como é hoje, em vez de um plano. */
export const isSystemDoc = (doc: ArchDoc) => doc.kind === "system";
/** Algum elemento ou relação muda: só aí fazem sentido legenda, "Só mudanças" e "Abrir tudo que muda". */
export const docHasChanges = (doc: ArchDoc, m: Model) =>
  [...m.index.values()].some((e) => statusOf(e) !== "unchanged") || (doc.relations ?? []).some((r) => statusOf(r) !== "unchanged");

export const statusOf = (x: { status?: Status }): Status => x.status ?? "unchanged";
/** O plano implementa (não é ator nem peça de fora). */
export const implementable = (m: Model, el: ArchElement) => !typeMeta(m.notation, el.type).context;
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
