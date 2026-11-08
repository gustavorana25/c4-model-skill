import { ElementIcon } from "../ElementIcon";
import type { NodeProps } from "@xyflow/react";
import { ChevronUp } from "lucide-react";
import { memo } from "react";
import type { BoundaryFlowNode } from "../../lib/layout";
import { STATUS_META } from "../../lib/meta";
import { typeMeta } from "../../lib/notation";
import { statusOf } from "../../lib/model";
import { useStore } from "../../store";
import { cn } from "../ui";

/**
 * Caixa aberta. Duas origens: o caminho do foco (modo página) ou uma caixa aberta no lugar
 * (canvas único), que tem botão de fechar e a cor do status na borda.
 */
export const BoundaryNode = memo(function BoundaryNode({ data }: NodeProps<BoundaryFlowNode>) {
  const { el, isFocus, open } = data;
  const setFocus = useStore((s) => s.setFocus);
  const select = useStore((s) => s.select);
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const T = typeMeta(useStore((s) => s.model!.notation), el.type);
  const st = statusOf(el);
  const tone = open && st !== "unchanged" && st !== "removed" ? STATUS_META[st].stroke : null;
  return (
    <div
      className={cn(
        "h-full w-full rounded-2xl border-[1.5px]",
        open ? "border-solid bg-[rgba(20,27,40,.38)]" : "border-dashed",
        !open && (isFocus ? "border-[#344058] bg-[rgba(20,27,40,.55)]" : "border-[#2C3547] bg-[rgba(20,27,40,.3)]"),
      )}
      style={open ? { borderColor: tone ? `${tone}66` : "#2C3547" } : undefined}
    >
      <div className="absolute inset-x-3 top-3 flex items-center gap-2">
        <button
          type="button"
          className="nodrag flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1 text-[13px] font-semibold text-fg-2 transition hover:text-accent-ink"
          onClick={(e) => {
            e.stopPropagation();
            if (open) select({ kind: "el", id: el.id });
            else if (!isFocus) setFocus(el.id);
          }}
          title={open ? `Ver detalhes de ${el.name}` : isFocus ? undefined : `Ir para ${el.name}`}
        >
          <ElementIcon el={el} size={14} style={tone ? { color: tone } : undefined} />
          <span className="truncate">{el.name}</span>
          <span className="truncate font-normal text-subtle">
            [{T.label}
            {el.tech ? `: ${el.tech}` : ""}]
          </span>
        </button>
        {open && (
          <button
            type="button"
            className="nodrag ml-auto flex shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-[#1C2433] px-2 py-px text-[11px] font-semibold leading-[18px] text-muted transition hover:bg-[#263045] hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(el.id);
            }}
            title="Fechar esta caixa"
          >
            Fechar <ChevronUp size={12} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  );
});
