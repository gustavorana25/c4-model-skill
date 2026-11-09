import {
  AppWindow, Circle, Cog, Database, MessagesSquare, PencilLine, Server, Smartphone, Sparkles, Table, Trash2, Zap,
  type LucideIcon,
} from "lucide-react";
import { ICONS, typeMeta, type Notation } from "./notation";
import type { ArchElement, Status } from "./types";

export const STATUS_META: Record<Status, { icon: LucideIcon; stroke: string; ink: string; soft: string }> = {
  new: { icon: Sparkles, stroke: "#46C46A", ink: "#6BDB8A", soft: "rgba(70,196,106,.14)" },
  changed: { icon: PencilLine, stroke: "#E3A23B", ink: "#F0B860", soft: "rgba(227,162,59,.14)" },
  removed: { icon: Trash2, stroke: "#F2685F", ink: "#FF9A90", soft: "rgba(242,104,95,.14)" },
  unchanged: { icon: Circle, stroke: "#5A6375", ink: "#A3ACBB", soft: "rgba(163,172,187,.10)" },
};

// Ícone inferido da tecnologia/nome (tipos com iconByTech, como container no c4),
// para "Web App" não parecer igual a "Order Worker".
const TECH_ICONS: [RegExp, LucideIcon][] = [
  [/\b(ios|android|mobile|react native|flutter|swift|kotlin)\b/i, Smartphone],
  [/\b(web|next(\.js)?|react|vue|angular|svelte|nuxt|remix|front[- ]?end|spa|site|portal)\b/i, AppWindow],
  [/\b(worker|job|cron|consumer|batch|scheduler)\b/i, Cog],
  [/\b(api|gateway|server|backend|fastify|express|spring|django|rails|nest|grpc|service)\b/i, Server],
];

// iconByTech "code" (component e code no c4): olha também nome e path, e o que é dado vem antes,
// para "Tabela users", "ChallengeRepository" e "db/migrations/x.sql" não virarem a mesma peça genérica.
type Matcher = { test(s: string): boolean };
const CODE_ICONS: [Matcher, LucideIcon][] = [
  [/\b(tabelas?|tables?|migrations?|migra[çc](ão|ao|ões|oes)|ddl|schema)\b|\.sql$|\/migrations?\//i, Table],
  [or(/\b(orm|prisma|typeorm|sequelize|sql|postgres(ql)?|mysql|sqlite|mongo(db)?|dynamo(db)?|redis|cache|banco)\b/i, words("repository", "repo", "dao", "model", "entity")), Database],
  [or(/\b(events?|eventos?|webhooks?)\b/i, words("event", "listener", "subscriber")), Zap],
  [or(/\b(topics?|tópicos?|queues?|filas?|kafka|sqs|sns|pub\/?sub|rabbit(mq)?)\b/i, words("producer", "publisher")), MessagesSquare],
  [or(/\b(telas?|ui)\b|\.(tsx|jsx|vue|svelte)$/i, words("page", "screen", "view", "modal", "form", "dialog")), AppWindow],
  [words("controller", "handler", "router", "route", "endpoint", "resolver"), Server],
  ...TECH_ICONS,
];

/**
 * Palavra inteira ("order view", "user.model.ts") ou fim de um nome em camelCase ("LoginPage", "OrderController"),
 * mas não o meio de outra palavra: "Review" e "Platform" não viram tela.
 */
function words(...ws: string[]): RegExp {
  const ci = (w: string) => w.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`);
  const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
  return new RegExp(`(?:\\b(?:${ws.map(ci).join("|")})|(?<=[a-z0-9])(?:${ws.map(cap).join("|")}))s?\\b`);
}
function or(a: Matcher, b: Matcher): Matcher {
  return { test: (s) => a.test(s) || b.test(s) };
}

export interface IconContext {
  /** Tipo do elemento pai, para iconByParent. */
  parentType?: string | null;
}

/**
 * Ícone do elemento, nesta ordem: `icon` do próprio elemento; o inferido de tech/nome/path (iconByTech);
 * o do tipo do pai (iconByParent); o do tipo.
 */
export function elementIcon(el: ArchElement, n: Notation, ctx: IconContext = {}): LucideIcon {
  if (el.icon && ICONS[el.icon]) return ICONS[el.icon];
  const T = typeMeta(n, el.type);
  if (T.iconByTech === "app") {
    const text = `${el.tech ?? ""} ${el.name}`;
    for (const [re, icon] of TECH_ICONS) if (re.test(text)) return icon;
  } else if (T.iconByTech === "code") {
    // path testado sozinho: as regras de extensão e pasta olham o fim e as barras dele
    for (const [re, icon] of CODE_ICONS) if (re.test(`${el.tech ?? ""} ${el.name}`) || (el.path && re.test(el.path))) return icon;
  }
  const byParent = ctx.parentType ? T.iconByParent.get(ctx.parentType) : undefined;
  return byParent ?? T.icon;
}
