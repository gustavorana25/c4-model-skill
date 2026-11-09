import { ElementIcon } from "../ElementIcon";
import { ArrowRight, ChevronRight, FileText, MessageCircle } from "lucide-react";
import { typeMeta } from "../../lib/notation";
import { descendants, hasChildren, statusOf, type Model } from "../../lib/model";
import type { Relation } from "../../lib/types";
import { useT } from "../../i18n";
import { useStore } from "../../store";
import { Button, SectionTitle, StatusPill } from "../ui";
import { ZoomLink } from "../canvas/ZoomLink";

export function ElementDetails({ id }: { id: string }) {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const isOpen = useStore((s) => s.expanded.has(id));
  const t = useT();
  const el = model.index.get(id);
  if (!el) return null;

  const T = typeMeta(model.notation, el.type);
  const st = statusOf(el);
  const ids = new Set([el.id, ...descendants(el)]);
  const steps = (doc.steps ?? []).map((s, i) => ({ s, i })).filter(({ s }) => s.touches.some((t) => ids.has(t)));
  const rels = (doc.relations ?? []).filter((r) => ids.has(r.from) !== ids.has(r.to) || r.from === id || r.to === id);

  const comment = () => useStore.getState().setCommenting(true, [el.id]);

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
        {el.path && <code className="self-start break-all font-mono text-[12px] text-fg-2">{el.path}</code>}
        {el.description && <p className="mt-1 leading-relaxed text-[#B7C0D0]">{el.description}</p>}
        {hasChildren(el) && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="bg-[#161D2A]" onClick={() => toggleExpanded(el.id)}>
              {isOpen ? t("side.closeInDiagram") : t("side.openChildren", el.children!.length)}{" "}
              <ChevronRight size={14} className={isOpen ? "-rotate-90" : ""} />
            </Button>
            <ZoomLink
              id={el.id}
              className="h-8 gap-2 rounded-[10px] bg-[#161D2A] px-2.5 text-[13px] font-medium text-fg-2 ring-1 ring-inset ring-line-strong transition-colors hover:bg-hover hover:text-fg"
            >
              {t("node.zoom")}
            </ZoomLink>
          </div>
        )}
      </div>

      {(!!el.constraints?.length || el.notes) && (
        <section>
          <SectionTitle>{t("side.constraints")}</SectionTitle>
          <div className="rounded-xl border border-line bg-[#121824] px-3.5 py-3">
            {!!el.constraints?.length && (
              <ul className="flex flex-col gap-1.5">
                {el.constraints.map((c, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-fg-2">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-subtle" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {el.notes && (
              <p className={`text-[13px] leading-relaxed text-fg-2 whitespace-pre-line ${el.constraints?.length ? "mt-3 border-t border-line pt-3" : ""}`}>{el.notes}</p>
            )}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>{t("side.stepsTouching")}</SectionTitle>
        {steps.length ? (
          <ul className="flex flex-col">
            {steps.map(({ s, i }) => (
              <StepLink key={s.id} index={i} title={s.title} id={s.id} />
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-subtle">{t("side.noStepsTouching")}</p>
        )}
      </section>

      {rels.length > 0 && (
        <section>
          <SectionTitle>{t("side.relations")}</SectionTitle>
          <ul className="flex flex-col gap-1.5">
            {rels.map((r, i) => (
              <RelationItem key={i} r={r} model={model} />
            ))}
          </ul>
        </section>
      )}

      <Button variant="outline" onClick={comment}>
        <MessageCircle size={15} /> {t("side.ask")} <kbd className="ml-1 text-[11px] text-subtle">C</kbd>
      </Button>
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
