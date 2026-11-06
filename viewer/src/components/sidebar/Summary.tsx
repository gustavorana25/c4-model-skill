import { ElementIcon } from "../ElementIcon";
import { ArrowRight } from "lucide-react";
import { STATUS_META, TYPE_META } from "../../lib/meta";
import { statusOf } from "../../lib/model";
import { useStore } from "../../store";
import { DetailPill, SectionTitle } from "../ui";

const KINDS = ["new", "changed", "removed"] as const;

/** Visão geral: o que o plano cria, altera e remove no que existe hoje. */
export function Summary() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const goto = useStore((s) => s.goto);

  const els = [...model.index.values()];
  const groups = KINDS.map((k) => ({ k, els: els.filter((e) => statusOf(e) === k) }));
  const touched = groups.some((g) => g.els.length);

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">Plano</div>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-fg">{doc.plan}</h2>
        {doc.description && <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{doc.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {groups.map(({ k, els }) => {
          const S = STATUS_META[k];
          return (
            <div key={k} className="rounded-xl border border-line bg-[#121824] px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: S.ink }}>
                <S.icon size={12} /> {S.label}s
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
                <span style={{ color: STATUS_META[k].ink }}>{STATUS_META[k].label}s</span>
              </SectionTitle>
              <ul className="overflow-hidden rounded-xl border border-line">
                {els.map((e, i) => {
                  const T = TYPE_META[e.type];
                  return (
                    <li key={e.id} className={i ? "border-t border-line" : ""}>
                      <button
                        type="button"
                        onClick={() => goto(e.id)}
                        className="group flex min-h-11 w-full cursor-pointer items-center gap-2.5 bg-[#121824] px-3 py-2 text-left text-[13px] text-fg-2 transition hover:bg-hover"
                      >
                        <ElementIcon el={e} size={14} className="shrink-0" style={{ color: T.ink }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fg">{e.name}</span>
                          <span className="block truncate text-[12px] text-subtle">
                            {T.label}
                            {e.tech && ` · ${e.tech}`}
                          </span>
                        </span>
                        {e.detail && <DetailPill detail={e.detail} />}
                        <ArrowRight size={14} className="shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
      ) : (
        <p className="text-[13px] text-subtle">Este plano não marca nenhum elemento como novo, alterado ou removido.</p>
      )}

      <section>
        <SectionTitle>Como usar</SectionTitle>
        <ol className="flex flex-col gap-3">
          {[
            ["Veja o que muda", "Verde é novo, laranja é alterado, tracejado é removido. Use “Abrir” para descer de nível."],
            ["Siga os passos", "Na aba Passos, cada passo acende os elementos que ele toca."],
            ["Pergunte ou peça mudança", "Aperte C, clique nos cards e escreva. A conversa acontece no chat."],
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
