import type { LucideProps } from "lucide-react";
import { elementIcon } from "../lib/meta";
import type { ArchElement } from "../lib/types";

/** Ícone do elemento: o do tipo C4, ou um mais específico inferido para containers (web, mobile, API, worker). */
export function ElementIcon({ el, ...props }: LucideProps & { el: ArchElement }) {
  const Icon = elementIcon(el);
  return <Icon aria-hidden="true" {...props} />;
}
