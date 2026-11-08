import { AppWindow, Circle, Cog, PencilLine, Server, Smartphone, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { typeMeta, type Notation } from "./notation";
import type { ArchElement, Status } from "./types";

export const STATUS_META: Record<Status, { label: string; icon: LucideIcon; stroke: string; ink: string; soft: string }> = {
  new: { label: "Novo", icon: Sparkles, stroke: "#46C46A", ink: "#6BDB8A", soft: "rgba(70,196,106,.14)" },
  changed: { label: "Alterado", icon: PencilLine, stroke: "#E3A23B", ink: "#F0B860", soft: "rgba(227,162,59,.14)" },
  removed: { label: "Removido", icon: Trash2, stroke: "#F2685F", ink: "#FF9A90", soft: "rgba(242,104,95,.14)" },
  unchanged: { label: "Inalterado", icon: Circle, stroke: "#5A6375", ink: "#A3ACBB", soft: "rgba(163,172,187,.10)" },
};

// Ícone inferido da tecnologia/nome (tipos com iconByTech, como container no c4),
// para "Web App" não parecer igual a "Order Worker".
const TECH_ICONS: [RegExp, LucideIcon][] = [
  [/\b(ios|android|mobile|react native|flutter|swift|kotlin)\b/i, Smartphone],
  [/\b(web|next(\.js)?|react|vue|angular|svelte|nuxt|remix|front[- ]?end|spa|site|portal)\b/i, AppWindow],
  [/\b(worker|job|cron|consumer|batch|scheduler)\b/i, Cog],
  [/\b(api|gateway|server|backend|fastify|express|spring|django|rails|nest|grpc|service)\b/i, Server],
];

export function elementIcon(el: ArchElement, n: Notation): LucideIcon {
  const T = typeMeta(n, el.type);
  if (T.iconByTech) {
    const text = `${el.tech ?? ""} ${el.name}`;
    for (const [re, icon] of TECH_ICONS) if (re.test(text)) return icon;
  }
  return T.icon;
}
