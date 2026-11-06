import { ElementIcon } from "../ElementIcon";
import { TalkToAI } from "./TalkToAI";
import { ArrowRight, Check, CheckCircle2, ChevronRight, FileText, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { DETAIL_META, DETAILS, TYPE_META } from "../../lib/meta";
import { descendants, hasChildren, implementable, statusOf, type Model } from "../../lib/model";
import type { ArchDoc, ArchElement, Relation } from "../../lib/types";
import { useStore } from "../../store";
import { Button, SectionTitle, StatusPill, cn } from "../ui";

function findEl(doc: ArchDoc, id: string): ArchElement | undefined {
  const walk = (els: ArchElement[]): ArchElement | undefined => {
    for (const e of els) {
      if (e.id === id) return e;
      const f = e.children && walk(e.children);
      if (f) return f;
    }
  };
  return walk(doc.elements);
}

const field =
  "rounded-[10px] border border-line-strong bg-canvas px-3 text-[13px] text-fg placeholder:text-subtle focus:border-accent-soft focus:outline-none focus:ring-2 focus:ring-[rgba(110,155,255,.25)]";

export function ElementDetails({ id }: { id: string }) {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const edit = useStore((s) => s.edit);
  const setFocus = useStore((s) => s.setFocus);
  const [draft, setDraft] = useState("");
  const el = model.index.get(id);
  if (!el) return null;

  const T = TYPE_META[el.type];
  const st = statusOf(el);
  const change = (fn: (e: ArchElement) => void) => edit((d) => fn(findEl(d, id)!));
  const ids = new Set([el.id, ...descendants(el)]);
  const steps = (doc.steps ?? []).map((s, i) => ({ s, i })).filter(({ s }) => s.touches.some((t) => ids.has(t)));
  const rels = (doc.relations ?? []).filter((r) => ids.has(r.from) !== ids.has(r.to) || r.from === id || r.to === id);
  const reviewable = implementable(el) && (st === "new" || st === "changed");

  const addConstraint = () => {
    const v = draft.trim();
    if (!v) return;
    change((e) => (e.constraints ??= []).push(v));
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-[12px] text-subtle">
          <ElementIcon el={el} size={13} style={{ color: T.ink }} />
          {T.label}
          {el.tech && <> · {el.tech}</>}
        </span>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-fg">{el.name}</h2>
          <StatusPill status={st} />
        </div>
        <code className="self-start rounded-md bg-[#161D2A] px-1.5 py-0.5 font-mono text-[11.5px] text-muted">{el.id}</code>
        {el.description && <p className="mt-1 leading-relaxed text-[#B7C0D0]">{el.description}</p>}
        {hasChildren(el) && (
          <Button variant="outline" size="sm" className="mt-1.5 self-start bg-[#161D2A]" onClick={() => setFocus(el.id)}>
            Abrir {el.children!.length} {el.children!.length === 1 ? "elemento interno" : "elementos internos"} <ChevronRight size={14} />
          </Button>
        )}
      </div>

      {implementable(el) && (
        <>
          <section>
            <SectionTitle>Liberdade da IA</SectionTitle>
            <div role="radiogroup" aria-label="Liberdade da IA" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-[#121824] p-1">
              {DETAILS.map((k) => {
                const D = DETAIL_META[k];
                const on = el.detail === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => change((e) => (on ? delete e.detail : (e.detail = k)))}
                    className={cn(
                      "flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border text-[13px] transition",
                      on ? "border-line-focus bg-[#1E2738] font-semibold" : "border-transparent text-muted hover:text-fg",
                    )}
                    style={on ? { color: D.ink } : undefined}
                  >
                    <D.icon size={14} />
                    {D.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              {el.detail ? DETAIL_META[el.detail].help : "Ainda não definido. Sem isso a IA trata como Guided e pergunta se tiver dúvida."}
            </p>
          </section>

          <section>
            <SectionTitle>Restrições</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {(el.constraints ?? []).map((c, i) => (
                <li key={i} className="group flex items-start gap-2 rounded-[10px] border border-line bg-[#121824] px-3 py-2.5 text-[13px] text-fg-2">
                  <span className="flex-1">{c}</span>
                  <button
                    type="button"
                    onClick={() =>
                      change((e) => {
                        e.constraints!.splice(i, 1);
                        if (!e.constraints!.length) delete e.constraints;
                      })
                    }
                    className="cursor-pointer text-subtle opacity-0 transition group-hover:opacity-100 hover:text-st-removed-ink focus:opacity-100"
                    aria-label={`Remover restrição: ${c}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className={cn("flex gap-2", !!el.constraints?.length && "mt-2")}>
              <label htmlFor="nova-restricao" className="sr-only">
                Nova restrição
              </label>
              <input
                id="nova-restricao"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addConstraint()}
                placeholder="Nova restrição…"
                className={cn(field, "h-10 min-w-0 flex-1")}
              />
              <Button variant="outline" className="w-10 bg-[#161D2A] px-0" onClick={addConstraint} disabled={!draft.trim()} aria-label="Adicionar restrição">
                <Plus size={16} />
              </Button>
            </div>
          </section>
        </>
      )}

      <section>
        <SectionTitle>Passos que tocam este elemento</SectionTitle>
        {steps.length ? (
          <ul className="flex flex-col">
            {steps.map(({ s, i }) => (
              <StepLink key={s.id} index={i} title={s.title} id={s.id} />
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-subtle">Nenhum passo toca este elemento.</p>
        )}
      </section>

      {rels.length > 0 && (
        <section>
          <SectionTitle>Relações</SectionTitle>
          <ul className="flex flex-col gap-1.5">
            {rels.map((r, i) => (
              <RelationItem key={i} r={r} model={model} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <label htmlFor="notas" className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">
          Notas para a IA
        </label>
        <textarea
          id="notas"
          value={el.notes ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            change((x) => (v ? (x.notes = v) : delete x.notes));
          }}
          placeholder="Comentário ou instrução…"
          rows={3}
          className={cn(field, "w-full resize-y py-2.5")}
        />
      </section>

      <TalkToAI elementId={el.id} />

      {reviewable &&
        (el.reviewed ? (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#24432E] bg-[#121F17] px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-[#8BE3A3]">
              <CheckCircle2 size={16} /> Revisado
            </span>
            <Button variant="ghost" size="sm" onClick={() => change((e) => delete e.reviewed)}>
              <RotateCcw size={13} /> Desfazer
            </Button>
          </div>
        ) : (
          <Button variant="success" size="lg" onClick={() => change((e) => (e.reviewed = true))}>
            <Check size={16} strokeWidth={2.4} /> Marcar como revisado
          </Button>
        ))}
    </div>
  );
}

function StepLink({ index, title, id }: { index: number; title: string; id: string }) {
  const pin = useStore((s) => s.pinStep);
  const setTab = useStore((s) => s.setTab);
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          pin(id);
          setTab("steps");
        }}
        className="group flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left text-[13px] text-fg-2 transition hover:bg-hover"
      >
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-hover text-[11px] font-bold text-fg-2">
          {index + 1}
        </span>
        <span className="flex-1">{title}</span>
        <ArrowRight size={13} className="text-subtle opacity-0 transition group-hover:opacity-100" />
      </button>
    </li>
  );
}

export function RelationItem({ r, model }: { r: Relation; model: Model }) {
  const goto = useStore((s) => s.goto);
  const name = (id: string) => model.index.get(id)?.name ?? id;
  const st = statusOf(r);
  return (
    <li className="rounded-[10px] border border-line bg-[#121824] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[13px]">
        <button type="button" className="cursor-pointer font-medium text-fg hover:text-accent-ink" onClick={() => goto(r.from)}>
          {name(r.from)}
        </button>
        <ArrowRight size={13} className="shrink-0 text-subtle" />
        <button type="button" className="cursor-pointer font-medium text-fg hover:text-accent-ink" onClick={() => goto(r.to)}>
          {name(r.to)}
        </button>
        {st !== "unchanged" && (
          <span className="ml-auto">
            <StatusPill status={st} />
          </span>
        )}
      </div>
      {(r.label || r.protocol) && (
        <div className="mt-0.5 text-[12.5px] text-muted">
          {r.label}
          {r.label && r.protocol && " · "}
          {r.protocol && <span className="text-subtle">{r.protocol}</span>}
        </div>
      )}
      {r.contract && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
          <FileText size={12} className="text-subtle" />
          <code className="rounded bg-[#161D2A] px-1.5 py-0.5 font-mono text-[11px] text-fg-2">{r.contract}</code>
        </div>
      )}
    </li>
  );
}
