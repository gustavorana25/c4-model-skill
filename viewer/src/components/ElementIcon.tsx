import type { LucideProps } from "lucide-react";
import { elementIcon } from "../lib/meta";
import type { ArchElement } from "../lib/types";
import { useStore } from "../store";

/** Ícone do elemento: o do tipo na notação, ou um inferido da tecnologia (web, mobile, API, worker) quando o tipo pede. */
export function ElementIcon({ el, ...props }: LucideProps & { el: ArchElement }) {
  const notation = useStore((s) => s.model?.notation);
  if (!notation) return null;
  const Icon = elementIcon(el, notation);
  return <Icon aria-hidden="true" {...props} />;
}
