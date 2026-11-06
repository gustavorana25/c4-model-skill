import { Route } from "lucide-react";
import { hopLabel, hopRelation } from "../../lib/flow";
import { statusOf } from "../../lib/model";
import { STATUS_META } from "../../lib/meta";
import { useStore } from "../../store";
import { cn } from "../ui";

/** Fluxos: como o sistema funciona depois do plano, salto a salto. */
export function FlowsPanel() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const flow = useStore((s) => s.flow);
  const openFlow = useStore((s) => s.openFlow);
  const setHop = useStore((s) => s.setHop);
  const follow = useStore((s) => s.followFlow);
  const toggleFollow = useStore((s) => s.toggleFollowFlow);
  const flows = doc.flows ?? [];
  const name = (id: string) => model.index.get(id)?.name ?? id;

  if (!flows.length) return <p className="p-5 text-[13px] text-subtle">Nenhum fluxo neste plano.</p>;

  return (
    <div className="flex flex-col gap-1 px-3 py-4">
      <p className="mx-2 mb-1 text-[13px] text-muted">
        Como o sistema funciona depois do plano. Abra um fluxo e avance com ← →.
      </p>
      <label className="mx-2 mb-2.5 flex cursor-pointer items-center gap-2 text-[12.5px] text-fg-2">
        <input type="checkbox" checked={follow} onChange={toggleFollow} className="accent-[#4F7DF3]" />
        Abrir as caixas de cada salto
      </label>
      {flows.map((f) => {
        const on = flow?.id === f.id;
        return (
          <div key={f.id} className={cn("rounded-xl border transition", on ? "border-[#2B3B5C] bg-[#131C2E]" : "border-transparent hover:bg-hover")}>
            <button
              type="button"
              aria-expanded={on}
              onClick={() => openFlow(on ? null : f.id)}
              className="flex w-full cursor-pointer items-start gap-3 p-2.5 text-left"
            >
              <span
                className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", on ? "bg-accent text-white" : "bg-hover text-fg-2")}
              >
                <Route size={14} />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className={cn("block text-[13.5px] leading-snug", on ? "font-semibold text-fg" : "text-fg-2")}>{f.title}</span>
                <span className="block text-[12px] text-subtle">{f.hops.length} saltos</span>
              </span>
            </button>
            {on && (
              <div className="pb-2">
                {f.description && <p className="mx-3 mb-2 ml-[50px] text-[12.5px] text-muted">{f.description}</p>}
                <ol className="flex flex-col">
                  {f.hops.map((h, i) => {
                    const cur = flow!.hop === i;
                    const st = statusOf(hopRelation(doc, h)?.rel ?? {});
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => setHop(i)}
                          aria-current={cur ? "step" : undefined}
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition",
                            cur ? "bg-accent-bg" : "hover:bg-hover",
                            i > flow!.hop && "opacity-55",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                              cur ? "bg-accent text-white" : "bg-hover text-fg-2",
                            )}
                          >
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-fg">
                              {name(h.from)} → {name(h.to)}
                            </span>
                            <span className="block text-muted">{hopLabel(doc, h)}</span>
                          </span>
                          {st !== "unchanged" && (
                            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: STATUS_META[st].stroke }} title={STATUS_META[st].label} />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
