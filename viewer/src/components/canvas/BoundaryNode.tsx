import { ElementIcon } from "../ElementIcon";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { BoundaryFlowNode } from "../../lib/layout";
import { TYPE_META } from "../../lib/meta";
import { useStore } from "../../store";
import { cn } from "../ui";

export const BoundaryNode = memo(function BoundaryNode({ data }: NodeProps<BoundaryFlowNode>) {
  const { el, isFocus } = data;
  const setFocus = useStore((s) => s.setFocus);
  const T = TYPE_META[el.type];
  return (
    <div
      className={cn(
        "h-full w-full rounded-2xl border-[1.5px] border-dashed",
        isFocus ? "border-[#344058] bg-[rgba(20,27,40,.55)]" : "border-[#2C3547] bg-[rgba(20,27,40,.3)]",
      )}
    >
      <button
        type="button"
        className="nodrag absolute left-4 top-3.5 flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-2 transition hover:text-accent-ink"
        onClick={(e) => {
          e.stopPropagation();
          if (!isFocus) setFocus(el.id);
        }}
        title={isFocus ? undefined : `Ir para ${el.name}`}
      >
        <ElementIcon el={el} size={14} />
        {el.name}
        <span className="font-normal text-subtle">
          [{T.label}
          {el.tech ? `: ${el.tech}` : ""}]
        </span>
      </button>
    </div>
  );
});
