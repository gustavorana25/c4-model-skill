import { ElementIcon } from "../ElementIcon";
import { FileText } from "lucide-react";
import { typeMeta } from "../../lib/notation";
import { useStore } from "../../store";
import { cn } from "../ui";

export function StepsPanel() {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const pinned = useStore((s) => s.pinnedStep);
  const pin = useStore((s) => s.pinStep);
  const goto = useStore((s) => s.goto);
  const steps = doc.steps ?? [];

  if (!steps.length) return <p className="p-5 text-[13px] text-subtle">Nenhum passo ligado a este diagrama.</p>;

  return (
    <div className="flex flex-col gap-1 px-3 py-4">
      <p className="mx-2 mb-2.5 text-[13px] text-muted">Clique num passo para ver no diagrama o que ele toca.</p>
      {steps.map((s, i) => {
        const on = pinned === s.id;
        const touched = s.touches.map((t) => model.index.get(t)).filter((e) => !!e);
        return (
          <div key={s.id} className={cn("rounded-xl border transition", on ? "border-[#2B3B5C] bg-[#131C2E]" : "border-transparent hover:bg-hover")}>
            <button
              type="button"
              aria-expanded={on}
              onClick={() => pin(on ? null : s.id)}
              className="flex w-full cursor-pointer items-start gap-3 p-2.5 text-left"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                  on ? "bg-accent text-white" : "bg-hover text-fg-2",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("pt-1 text-[13.5px] leading-snug", on ? "font-semibold text-fg" : "text-fg-2")}>{s.title}</span>
            </button>
            {on && (
              <div className="ml-[50px] mr-2.5 flex flex-col gap-2 pb-3">
                {s.description && <p className="text-[12.5px] text-muted">{s.description}</p>}
                {touched.map((el) => {
                  const T = typeMeta(model.notation, el.type);
                  const contracts = (doc.relations ?? []).filter((r) => (r.from === el.id || r.to === el.id) && r.contract);
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => goto(el.id)}
                      className="flex cursor-pointer flex-col gap-1.5 rounded-[10px] border border-[#222A39] bg-panel px-3 py-2.5 text-left transition hover:border-line-focus"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <b className="flex items-center gap-1.5 text-[13px] text-fg">
                          <ElementIcon el={el} size={13} style={{ color: T.ink }} /> {el.name}
                        </b>
                        <span className="text-[11px] text-subtle">{T.label.toLowerCase()}</span>
                      </span>
                      {!!el.constraints?.length && (
                        <span className="text-[12.5px] leading-relaxed text-muted">{el.constraints.join(" · ")}</span>
                      )}
                      {contracts.map((r) => (
                        <span key={r.contract} className="flex items-center gap-1.5 text-[12px] text-muted">
                          <FileText size={12} className="text-subtle" />
                          <code className="rounded bg-[#161D2A] px-1.5 py-px font-mono text-[11px] text-fg-2">{r.contract}</code>
                        </span>
                      ))}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
