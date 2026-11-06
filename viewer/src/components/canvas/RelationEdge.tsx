import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import type { RelationFlowEdge } from "../../lib/layout";
import { STATUS_META } from "../../lib/meta";
import { useStore } from "../../store";
import { cn } from "../ui";

/** Desenha a rota ortogonal calculada pelo ELK (ignora as posições dos handles). */
export const RelationEdge = memo(function RelationEdge({ id, data, markerEnd }: EdgeProps<RelationFlowEdge>) {
  const select = useStore((s) => s.select);
  if (!data) return null;
  const { points, label, text, proto, edge, dim, selected } = data;
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const color = selected ? "#6E9BFF" : STATUS_META[edge.status].stroke;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={18}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.6 : edge.status === "unchanged" ? 1.5 : 2,
          strokeDasharray: edge.status === "removed" ? "6 4" : undefined,
          opacity: dim ? 0.16 : 1,
          transition: "opacity .2s",
        }}
      />
      {label && text && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className={cn(
              "nodrag nopan absolute cursor-pointer rounded-md border bg-[#121824] px-1.5 py-0.5 text-center transition",
              selected ? "border-accent-soft" : "border-[#232B3A] hover:border-line-focus",
              dim && "opacity-[.16]",
            )}
            style={{ transform: `translate(${label.x}px, ${label.y}px)`, width: label.width, pointerEvents: "all" }}
            onClick={(e) => {
              e.stopPropagation();
              select({ kind: "edge", id });
            }}
          >
            <div className="truncate text-[11.5px] font-medium leading-4 text-[#B7C0D0]">{text}</div>
            {proto && <div className="truncate text-[10px] leading-3.5 text-subtle">{proto}</div>}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
