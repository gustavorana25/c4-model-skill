import { Minus, PencilLine, Plus, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { diffDocs, type Change } from "../../lib/diff";
import { DETAIL_META } from "../../lib/meta";
import { useStore } from "../../store";
import { cn } from "../ui";

function describe(c: Change): { icon: ReactNode; tone: string; text: ReactNode } {
  switch (c.kind) {
    case "detail": {
      const label = (d?: string) => (d ? DETAIL_META[d as keyof typeof DETAIL_META].label : "sem definição");
      return {
        icon: <SlidersHorizontal size={14} />,
        tone: "bg-chip text-d-delegated",
        text: (
          <>
            Liberdade <s className="text-subtle">{label(c.from)}</s> →{" "}
            <b style={{ color: c.to ? DETAIL_META[c.to].ink : undefined }}>{label(c.to)}</b>
          </>
        ),
      };
    }
    case "constraint-add":
      return { icon: <Plus size={14} />, tone: "bg-[#16241B] text-[#8BE3A3]", text: <>Nova restrição: “{c.text}”</> };
    case "constraint-del":
      return { icon: <Minus size={14} />, tone: "bg-[rgba(242,104,95,.12)] text-st-removed-ink", text: <>Restrição removida: “{c.text}”</> };
    case "notes":
      return {
        icon: <PencilLine size={14} />,
        tone: "bg-accent-bg text-accent-ink",
        text: c.to ? <>Nota para a IA: “{c.to.trim()}”</> : <>Nota removida</>,
      };
  }
}

export function ChangeList({ changes, compact }: { changes: Change[]; compact?: boolean }) {
  const goto = useStore((s) => s.goto);
  return (
    <ul className="overflow-hidden rounded-xl border border-[#222A39]">
      {changes.map((c, i) => {
        const d = describe(c);
        return (
          <li key={i} className={cn("border-line bg-panel", i > 0 && "border-t")}>
            <button
              type="button"
              onClick={() => goto(c.id)}
              className={cn("flex w-full cursor-pointer items-center gap-3 px-3.5 text-left transition hover:bg-hover", compact ? "py-2.5" : "py-3")}
            >
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", d.tone)}>{d.icon}</span>
              <span className="min-w-0 flex-1 text-[13px] leading-snug">
                <b className="text-fg">{c.name}</b>
                <span className="block text-muted">{d.text}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ChangesPanel() {
  const doc = useStore((s) => s.doc)!;
  const baseline = useStore((s) => s.baseline)!;
  const changes = diffDocs(baseline, doc);
  return (
    <div className="p-5">
      <p className="mb-4 text-[13px] leading-relaxed text-muted">
        O que você mudou desde que o link chegou. É isso que a IA vai ler quando você enviar.
      </p>
      {changes.length ? (
        <ChangeList changes={changes} />
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-subtle">
          Nenhuma alteração ainda. Ajuste a liberdade, as restrições ou as notas de um elemento.
        </p>
      )}
    </div>
  );
}
