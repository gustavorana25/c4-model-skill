import { Maximize2 } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useLocationHash } from "../../hooks";
import { useT } from "../../i18n";
import { useStore } from "../../store";
import { cn } from "../ui";

/** Endereço desta página focada em `id`: o mesmo plano (o hash atual sem o foco) com ~id no fim. */
export function focusHref(id: string, hash = location.hash): string {
  const base = hash.split("~")[0] || "#";
  return `${location.pathname}${location.search}${base}~${encodeURIComponent(id)}`;
}

/**
 * "Ampliar": mostra só o que tem dentro da caixa, com o breadcrumb para voltar.
 * É um link de verdade: Ctrl/Cmd+clique ou o botão do meio abrem o nível em outra aba.
 */
export function ZoomLink({ id, className, children }: { id: string; className?: string; children?: ReactNode }) {
  const setFocus = useStore((s) => s.setFocus);
  const t = useT();
  const hash = useLocationHash();
  return (
    <a
      href={focusHref(id, hash)}
      className={cn("nodrag flex shrink-0 cursor-pointer items-center gap-1", className)}
      title={t("node.zoomTitle")}
      aria-label={children ? undefined : t("node.zoom")}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // o navegador abre em outra aba/janela
        e.preventDefault();
        setFocus(id);
      }}
    >
      {children}
      <Maximize2 size={11} strokeWidth={2.6} />
    </a>
  );
}
