import { useStore, type SideTab } from "../../store";
import { cn } from "../ui";
import { EdgeDetails } from "./EdgeDetails";
import { ElementDetails } from "./ElementDetails";
import { FlowsPanel } from "./FlowsPanel";
import { StepsPanel } from "./StepsPanel";
import { Summary } from "./Summary";

export function Sidebar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const selected = useStore((s) => s.selected);
  const doc = useStore((s) => s.doc)!;
  const steps = doc.steps?.length ?? 0;

  const tabs: { id: SideTab; label: string; count?: number }[] = [
    { id: "review", label: "Visão geral" },
    { id: "flows", label: "Fluxos", count: doc.flows?.length ?? 0 },
    { id: "steps", label: "Passos", count: steps },
  ];

  return (
    <aside className="flex w-[400px] shrink-0 flex-col border-l border-line bg-panel">
      <div role="tablist" className="flex gap-1 border-b border-line px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px flex h-11 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-[13px] transition",
              tab === t.id ? "border-accent-soft font-semibold text-fg" : "border-transparent font-medium text-muted hover:text-fg",
            )}
          >
            {t.label}
            {!!t.count && <span className="text-subtle">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "flows" ? (
          <FlowsPanel />
        ) : tab === "steps" ? (
          <StepsPanel />
        ) : selected?.kind === "el" ? (
          <ElementDetails key={selected.id} id={selected.id} />
        ) : selected?.kind === "edge" ? (
          <EdgeDetails id={selected.id} />
        ) : (
          <Summary />
        )}
      </div>
    </aside>
  );
}
