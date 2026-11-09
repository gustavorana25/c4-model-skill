import type { LucideProps } from "lucide-react";
import { elementIcon } from "../lib/meta";
import type { ArchElement } from "../lib/types";
import { useStore } from "../store";

/**
 * Ícone do elemento: o `icon` dele; o inferido da tecnologia, do nome e do path quando o tipo pede;
 * o do tipo do pai (componente dentro de banco = tabela); ou o do tipo.
 */
export function ElementIcon({ el, ...props }: LucideProps & { el: ArchElement }) {
  const model = useStore((s) => s.model);
  if (!model) return null;
  const pid = model.parent.get(el.id);
  const Icon = elementIcon(el, model.notation, { parentType: pid ? model.index.get(pid)?.type : null });
  return <Icon aria-hidden="true" {...props} />;
}
