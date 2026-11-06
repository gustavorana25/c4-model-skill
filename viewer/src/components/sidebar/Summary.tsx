import { ElementIcon } from "../ElementIcon";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { reviewables } from "../../lib/diff";
import { STATUS_META, TYPE_META } from "../../lib/meta";
import { statusOf } from "../../lib/model";
import { useStore } from "../../store";
import { SectionTitle } from "../ui";

export function Summary() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const goto = useStore((s) => s.goto);

  const els = [...model.index.values()];
  const counts = (["new", "changed", "removed"] as const).map((k) => ({ k, n: els.filter((e) => statusOf(e) === k).length }));
  const pending = reviewables(model).filter((e) => !e.reviewed);

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">Plano</div>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-fg">{doc.plan}</h2>
        {doc.description && <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{doc.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {counts.map(({ k, n }) => {
          const S = STATUS_META[k];
          return (
            <div key={k} className="rounded-xl border border-line bg-[#121824] px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: S.ink }}>
                <S.icon size={12} /> {S.label}s
              </div>
              <div className="mt-0.5 text-2xl font-semibold tabular-nums text-fg">{n}</div>
            </div>
          );
        })}
      </div>

      <section>
        <SectionTitle>Falta revisar · {pending.length}</SectionTitle>
        {pending.length ? (
          <ul className="overflow-hidden rounded-xl border border-line">
            {pending.map((e, i) => {
              const T = TYPE_META[e.type];
              return (
                <li key={e.id} className={i ? "border-t border-line" : ""}>
                  <button
                    type="button"
                    onClick={() => goto(e.id)}
                    className="group flex min-h-11 w-full cursor-pointer items-center gap-2.5 bg-[#121824] px-3 text-left text-[13px] text-fg-2 transition hover:bg-hover"
                  >
                    <ElementIcon el={e} size={14} style={{ color: T.ink }} />
                    <span className="flex-1">{e.name}</span>
                    {!e.detail && <span className="text-[11.5px] text-st-changed-ink">sem liberdade</span>}
                    <ArrowRight size={14} className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-st-new-ink">
            <CheckCircle2 size={15} /> Tudo revisado. Envie para a IA quando quiser.
          </p>
        )}
      </section>

      <section>
        <SectionTitle>Como revisar</SectionTitle>
        <ol className="flex flex-col gap-3">
          {[
            ["Confira fronteiras e relações", "Use “Abrir” para descer de nível só onde importa."],
            ["Decida a liberdade da IA", "Locked, Guided ou Delegated, mais restrições e notas."],
            ["Envie para a IA", "Aprove a estrutura no diálogo e copie o link."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-bg text-[12px] font-bold text-accent-ink">
                {i + 1}
              </span>
              <div>
                <div className="text-[13.5px] font-medium text-fg">{t}</div>
                <div className="text-[12.5px] text-muted">{d}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
