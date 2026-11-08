import { ElementIcon } from "../ElementIcon";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronRight } from "lucide-react";
import { memo } from "react";
import type { ElementFlowNode } from "../../lib/layout";
import { STATUS_META } from "../../lib/meta";
import { typeMeta } from "../../lib/notation";
import { statusOf } from "../../lib/model";
import type { Status } from "../../lib/types";
import { useT } from "../../i18n";
import { useStore } from "../../store";
import { cn, StatusPill } from "../ui";

const hidden = "!pointer-events-none !opacity-0 !min-h-0 !min-w-0 !size-1 !border-0";

/** Mesma regra que nodeHeight() usa para reservar a linha de selos. */
const hasFooter = (st: Status, children: boolean) => st !== "unchanged" || children;

export const ElementNode = memo(function ElementNode({ data }: NodeProps<ElementFlowNode>) {
  const { el, dim, selected, hasChildren, commentTarget, flowActive } = data;
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  // num plano, o que não muda é contexto: fica um pouco atrás do que muda, mas legível.
  // na documentação (nada muda), tudo tem o mesmo peso.
  const recede = useStore((s) => !!s.model?.changes);
  const st = statusOf(el);
  const T = typeMeta(useStore((s) => s.model!.notation), el.type);
  const S = STATUS_META[st];
  const t = useT();

  const ring = flowActive
    ? "0 0 0 3px #FFFFFF, 0 0 0 9px rgba(110,155,255,.45), 0 10px 30px rgba(0,0,0,.45)"
    : commentTarget
    ? "0 0 0 3px #6E9BFF, 0 0 0 9px rgba(110,155,255,.22), 0 10px 30px rgba(0,0,0,.45)"
    : selected
    ? "0 0 0 3px #6E9BFF, 0 0 0 8px rgba(110,155,255,.16), 0 10px 30px rgba(0,0,0,.45)"
    : st !== "unchanged" && st !== "removed"
      ? `0 0 0 2px ${S.stroke}, 0 8px 24px rgba(0,0,0,.35)`
      : "0 6px 18px rgba(0,0,0,.3)";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col rounded-xl border px-3.5 py-3 transition-[opacity,box-shadow] duration-200",
        selected ? "border-accent" : "border-[#273042]",
        recede && st === "unchanged" && !selected && "opacity-[.8]",
        dim && "!opacity-[.16]",
      )}
      style={{
        background: selected ? "#172034" : T.card,
        boxShadow: ring,
        outline: st === "removed" && !selected ? `2px dashed ${S.stroke}` : undefined,
        outlineOffset: 3,
      }}
    >
      <Handle type="target" position={Position.Top} className={hidden} />
      <div className="flex h-4 shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase leading-4 tracking-[.04em]" style={{ color: T.ink }}>
        <ElementIcon el={el} size={12} strokeWidth={2.2} className="shrink-0" />
        <span className="truncate">
          {T.label}
          {el.tech ? ` · ${el.tech}` : ""}
        </span>
      </div>
      <div className={cn("mt-1 shrink-0 text-[14.5px] font-semibold leading-[19px] text-fg", st === "removed" && "line-through")}>{el.name}</div>
      {el.description && <div className="mt-1 line-clamp-2 shrink-0 text-[12px] leading-4 text-muted">{el.description}</div>}
      {hasFooter(st, hasChildren) && (
      <div className="mt-auto flex shrink-0 items-center gap-1.5 pt-2">
        {st !== "unchanged" && <StatusPill status={st} upper />}
        {hasChildren && (
          <button
            type="button"
            className="nodrag ml-auto flex cursor-pointer items-center gap-0.5 rounded-full bg-[#22304A] px-2 py-px text-[11px] font-semibold leading-[18px] text-accent-ink transition hover:bg-[#2B3C5C]"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(el.id);
            }}
            title={t("node.openTitle")}
          >
            {t("node.open")} <ChevronRight size={12} strokeWidth={2.6} />
          </button>
        )}
      </div>
      )}
      <Handle type="source" position={Position.Bottom} className={hidden} />
    </div>
  );
});
