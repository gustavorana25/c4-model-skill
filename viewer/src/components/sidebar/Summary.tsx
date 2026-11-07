import { ElementIcon } from "../ElementIcon";
import { ArrowRight, Route } from "lucide-react";
import { STATUS_META, TYPE_META } from "../../lib/meta";
import { isSystemDoc, statusOf, titleOf } from "../../lib/model";
import type { ArchElement } from "../../lib/types";
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

  const els = [...model.index.values()];
  const groups = KINDS.map((k) => ({ k, els: els.filter((e) => statusOf(e) === k) }));
  const touched = groups.some((g) => g.els.length);

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">Plano</div>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-fg">{titleOf(doc)}</h2>
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
                {els.map((e, i) => (
                  <ElementRow key={e.id} el={e} first={!i} onClick={() => goto(e.id)} />
                ))}
              </ul>
            </section>
          ))
      ) : (
        <p className="text-[13px] text-subtle">Este plano não marca nenhum elemento como novo, alterado ou removido.</p>
      )}

      <HowTo items={PLAN_HOWTO} />
    </div>
  );
}

function ElementRow({ el, first, onClick }: { el: ArchElement; first: boolean; onClick: () => void }) {
  const T = TYPE_META[el.type];
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

const PLAN_HOWTO = [
  ["Veja o que muda", "Verde é novo, laranja é alterado, tracejado é removido. “Abrir” (ou duplo clique) abre a caixa no lugar; “Fechar” recolhe."],
  ["Siga um fluxo", "Na aba Fluxos, avance salto a salto (← →) e veja como o sistema funciona depois do plano."],
  ["Veja a ordem de construção", "Na aba Passos, cada passo acende os elementos que ele toca."],
  ["Pergunte ou peça mudança", "Aperte C, clique nos cards e escreva. A conversa acontece no chat."],
];

const SYSTEM_HOWTO = [
  ["Comece pelos fluxos", "Na aba Fluxos, siga o caminho principal salto a salto (← →). O diagrama abre as caixas por onde ele passa."],
  ["Desça onde quiser", "“Abrir” (ou duplo clique) mostra o que tem dentro, até os arquivos; “Fechar” recolhe."],
  ["Pergunte", "Aperte C, clique nos cards e escreva. A resposta vem no chat."],
];

function HowTo({ items }: { items: string[][] }) {
  return (
    <section>
      <SectionTitle>Como usar</SectionTitle>
      <ol className="flex flex-col gap-3">
        {items.map(([t, d], i) => (
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
  );
}

/** Documentação: do que o sistema é feito (as caixas de cada nível) e por onde começar. */
function SystemSummary() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const goto = useStore((s) => s.goto);
  const setTab = useStore((s) => s.setTab);
  const openFlow = useStore((s) => s.openFlow);

  const els = [...model.index.values()];
  const count = (types: string[]) => els.filter((e) => types.includes(e.type)).length;
  const stats = [
    ["Containers", count(["container", "database", "queue"])],
    ["Componentes", count(["component"])],
    ["Externos", count(["external"])],
  ] as const;
  // as peças que quem chega precisa conhecer: o que fica dentro dos sistemas, mais os externos
  const parts = els.filter((e) => ["container", "database", "queue", "external"].includes(e.type));
  const flows = doc.flows ?? [];

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">Sistema</div>
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
          <SectionTitle>Por onde começar</SectionTitle>
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
                    <span className="block truncate text-[12px] text-subtle">{f.description ?? `${f.hops.length} saltos`}</span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Peças</SectionTitle>
        <ul className="overflow-hidden rounded-xl border border-line">
          {parts.map((e, i) => (
            <ElementRow key={e.id} el={e} first={!i} onClick={() => goto(e.id)} />
          ))}
        </ul>
      </section>

      <HowTo items={SYSTEM_HOWTO} />
    </div>
  );
}
