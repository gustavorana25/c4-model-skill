import {
  AppWindow, Bot, FileCode2, Box, Boxes, Circle, Cog, Compass, Database, Globe, Lock, MessagesSquare, PencilLine, Puzzle, Server, Smartphone,
  Sparkles, Trash2, User, type LucideIcon,
} from "lucide-react";
import type { ArchElement, Detail, ElementType, Status } from "./types";

/** `label` curto vai no card; `ink` é a cor do rótulo de tipo. */
export const TYPE_META: Record<ElementType, { label: string; icon: LucideIcon; ink: string; card: string }> = {
  person: { label: "Pessoa", icon: User, ink: "#9DB8FF", card: "#141A25" },
  system: { label: "Sistema", icon: Boxes, ink: "#8FB0FF", card: "#141A25" },
  external: { label: "Sistema externo", icon: Globe, ink: "#A3ACBB", card: "#141A25" },
  container: { label: "Container", icon: Box, ink: "#6EA8FF", card: "#141A25" },
  database: { label: "Banco", icon: Database, ink: "#4FD1C5", card: "#141A25" },
  queue: { label: "Fila", icon: MessagesSquare, ink: "#4FD1C5", card: "#141A25" },
  component: { label: "Componente", icon: Puzzle, ink: "#8FC1FF", card: "#1A2638" },
  code: { label: "Código", icon: FileCode2, ink: "#B79CFF", card: "#1B1F33" },
};

export const STATUS_META: Record<Status, { label: string; icon: LucideIcon; stroke: string; ink: string; soft: string }> = {
  new: { label: "Novo", icon: Sparkles, stroke: "#46C46A", ink: "#6BDB8A", soft: "rgba(70,196,106,.14)" },
  changed: { label: "Alterado", icon: PencilLine, stroke: "#E3A23B", ink: "#F0B860", soft: "rgba(227,162,59,.14)" },
  removed: { label: "Removido", icon: Trash2, stroke: "#F2685F", ink: "#FF9A90", soft: "rgba(242,104,95,.14)" },
  unchanged: { label: "Inalterado", icon: Circle, stroke: "#5A6375", ink: "#A3ACBB", soft: "rgba(163,172,187,.10)" },
};

export const DETAIL_META: Record<Detail, { label: string; icon: LucideIcon; help: string; ink: string }> = {
  locked: {
    label: "Locked",
    icon: Lock,
    help: "Fixo. A IA não altera estrutura, contratos nem tecnologia; se precisar, ela para e pergunta.",
    ink: "#FFB4B4",
  },
  guided: {
    label: "Guided",
    icon: Compass,
    help: "A IA implementa seguindo as restrições abaixo; o resto ela decide pelo mais simples.",
    ink: "#8FD3FF",
  },
  delegated: {
    label: "Delegated",
    icon: Bot,
    help: "A IA decide o design interno. As restrições continuam valendo.",
    ink: "#C9B8FF",
  },
};

export const DETAILS = Object.keys(DETAIL_META) as Detail[];

// Ícone de container inferido da tecnologia/nome, para "Web App" não parecer igual a "Order Worker".
const CONTAINER_ICONS: [RegExp, LucideIcon][] = [
  [/\b(ios|android|mobile|react native|flutter|swift|kotlin)\b/i, Smartphone],
  [/\b(web|next(\.js)?|react|vue|angular|svelte|nuxt|remix|front[- ]?end|spa|site|portal)\b/i, AppWindow],
  [/\b(worker|job|cron|consumer|batch|scheduler)\b/i, Cog],
  [/\b(api|gateway|server|backend|fastify|express|spring|django|rails|nest|grpc|service)\b/i, Server],
];

export function elementIcon(el: ArchElement): LucideIcon {
  if (el.type === "container") {
    const text = `${el.tech ?? ""} ${el.name}`;
    for (const [re, icon] of CONTAINER_ICONS) if (re.test(text)) return icon;
  }
  return TYPE_META[el.type].icon;
}

/** Nível C4 da view focada no elemento (null = visão geral). */
export function levelLabel(focusType: ElementType | null): string {
  if (!focusType) return "Nível 1 · Contexto";
  if (focusType === "system") return "Nível 2 · Containers";
  if (focusType === "container" || focusType === "database" || focusType === "queue") return "Nível 3 · Componentes";
  if (focusType === "component") return "Nível 4 · Código";
  return "Detalhe";
}
