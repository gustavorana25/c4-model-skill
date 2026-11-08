import { ElementIcon } from "../ElementIcon";
import { ArrowRight, Route } from "lucide-react";
import { STATUS_META } from "../../lib/meta";
import { summaryStats, typeMeta } from "../../lib/notation";
import { isSystemDoc, statusOf, titleOf } from "../../lib/model";
import type { ArchElement } from "../../lib/types";
import { useT, type Key } from "../../i18n";
import { useStore } from "../../store";
import { SectionTitle } from "../ui";

const KINDS = ["new", "changed", "removed"] as const;

/** Visão geral: o que o plano cria, altera e remove no que existe hoje (ou, na documentação, do que o sistema é feito). */
export function Summary() {
  const doc = useStore((s) => s.doc)!;
  return isSystemDoc(doc) ? <SystemSummary /> : <PlanSummary />;
}

function PlanSummary() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const goto = useStore((s) => s.goto);
  const t = useT();

  const els = [...model.index.values()];
  const groups = KINDS.map((k) => ({ k, els: els.filter((e) => statusOf(e) === k) }));
  const touched = groups.some((g) => g.els.length);

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">{t("sum.plan")}</div>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-fg">{titleOf(doc)}</h2>
        {doc.description && <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{doc.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {groups.map(({ k, els }) => {
          const S = STATUS_META[k];
          return (
            <div key={k} className="rounded-xl border border-line bg-[#121824] px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: S.ink }}>
                <S.icon size={12} /> {t(`status.${k}.plural`)}
              </div>
              <div className="mt-0.5 text-2xl font-semibold tabular-nums text-fg">{els.length}</div>
            </div>
          );
        })}
      </div>

      {touched ? (
        groups
          .filter((g) => g.els.length)
          .map(({ k, els }) => (
            <section key={k}>
              <SectionTitle>
                <span style={{ color: STATUS_META[k].ink }}>{t(`status.${k}.plural`)}</span>
              </SectionTitle>
              <ul className="overflow-hidden rounded-xl border border-line">
                {els.map((e, i) => (
                  <ElementRow key={e.id} el={e} first={!i} onClick={() => goto(e.id)} />
                ))}
              </ul>
            </section>
          ))
      ) : (
        <p className="text-[13px] text-subtle">{t("sum.nothingMarked")}</p>
      )}

      <HowTo items={PLAN_HOWTO} />
    </div>
  );
}

function ElementRow({ el, first, onClick }: { el: ArchElement; first: boolean; onClick: () => void }) {
  const T = typeMeta(useStore((s) => s.model!.notation), el.type);
  return (
    <li className={first ? "" : "border-t border-line"}>
      <button
        type="button"
        onClick={onClick}
        className="group flex min-h-11 w-full cursor-pointer items-center gap-2.5 bg-[#121824] px-3 py-2 text-left text-[13px] text-fg-2 transition hover:bg-hover"
      >
        <ElementIcon el={el} size={14} className="shrink-0" style={{ color: T.ink }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-fg">{el.name}</span>
          <span className="block truncate text-[12px] text-subtle">
            {T.label}
            {el.tech && ` · ${el.tech}`}
          </span>
        </span>
        <ArrowRight size={14} className="shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
      </button>
    </li>
  );
}

/** Prefixos das chaves "howto.*" (cada um com .t e .d). */
const PLAN_HOWTO = ["plan1", "plan2", "plan3", "plan4"];
const SYSTEM_HOWTO = ["sys1", "sys2", "sys3"];

function HowTo({ items }: { items: string[] }) {
  const tr = useT();
  return (
    <section>
      <SectionTitle>{tr("sum.howTo")}</SectionTitle>
      <ol className="flex flex-col gap-3">
        {items.map((k, i) => (
          <li key={k} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-bg text-[12px] font-bold text-accent-ink">
              {i + 1}
            </span>
            <div>
              <div className="text-[13.5px] font-medium text-fg">{tr(`howto.${k}.t` as Key)}</div>
              <div className="text-[12.5px] text-muted">{tr(`howto.${k}.d` as Key)}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Documentação: do que o sistema é feito (as caixas de cada nível) e por onde começar. */
function SystemSummary() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const goto = useStore((s) => s.goto);
  const setTab = useStore((s) => s.setTab);
  const openFlow = useStore((s) => s.openFlow);
  const t = useT();

  const els = [...model.index.values()];
  const stats = summaryStats(model.notation, els.map((e) => e.type));
  // as peças que quem chega precisa conhecer (no c4: o que fica dentro dos sistemas, mais os externos)
  const partTypes = model.notation.parts;
  const parts = els.filter((e) => partTypes.includes(e.type));
  const flows = doc.flows ?? [];

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">{model.notation.name === "c4" ? t("sum.system") : t("sum.diagram")}</div>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-fg">{titleOf(doc)}</h2>
        {doc.description && <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{doc.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-line bg-[#121824] px-3 py-2.5">
            <div className="text-[11.5px] font-medium text-muted">{label}</div>
            <div className="mt-0.5 text-2xl font-semibold tabular-nums text-fg">{n}</div>
          </div>
        ))}
      </div>

      {flows.length > 0 && (
        <section>
          <SectionTitle>{t("sum.start")}</SectionTitle>
          <ul className="overflow-hidden rounded-xl border border-line">
            {flows.map((f, i) => (
              <li key={f.id} className={i ? "border-t border-line" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    setTab("flows");
                    openFlow(f.id);
                  }}
                  className="group flex min-h-11 w-full cursor-pointer items-center gap-2.5 bg-[#121824] px-3 py-2 text-left text-[13px] transition hover:bg-hover"
                >
                  <Route size={14} className="shrink-0 text-accent-ink" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{f.title}</span>
                    <span className="block truncate text-[12px] text-subtle">{f.description ?? t("flows.hops", f.hops.length)}</span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {parts.length > 0 && (
        <section>
          <SectionTitle>{t("sum.parts")}</SectionTitle>
          <ul className="overflow-hidden rounded-xl border border-line">
            {parts.map((e, i) => (
              <ElementRow key={e.id} el={e} first={!i} onClick={() => goto(e.id)} />
            ))}
          </ul>
        </section>
      )}

      <HowTo items={SYSTEM_HOWTO} />
    </div>
  );
}
