// Vocabulário do documento: tipo -> rótulo, ícone, cor e nível. Os presets vêm de
// skills/blueroll/schema/notations.json (o mesmo arquivo que o arch_url.py lê).
// Nenhum componente acessa um tipo direto: tudo passa por typeMeta() e levelLabel().
import {
  AppWindow, Bell, Bot, Box, Boxes, Brain, Calendar, ChartColumn, Circle, CircleStop, Clock, Cloud, Cog, Cpu, Database,
  Diamond, FileCode2, FileText, Flag, Folder, GitBranch, Globe, HardDrive, Hexagon, KeyRound, Layers, List, Lock, Mail,
  MapPin, MessagesSquare, Monitor, Network, Package, Play, Puzzle, Router, Rows3, Scroll, Server, Shapes, Shield,
  Smartphone, Split, Square, Table, Tag, Terminal, User, Users, Workflow, Wrench, Zap, type LucideIcon,
} from "lucide-react";
import presets from "../../../skills/blueroll/schema/notations.json";
import type { ArchDoc, TypeDef } from "./types";

/** Nome em notations.json -> ícone. Um teste garante que a lista "icons" do JSON e este mapa batem. */
export const ICONS: Record<string, LucideIcon> = {
  "app-window": AppWindow, bell: Bell, bot: Bot, box: Box, boxes: Boxes, brain: Brain, calendar: Calendar,
  chart: ChartColumn, circle: Circle, clock: Clock, cloud: Cloud, cog: Cog, cpu: Cpu, database: Database,
  diamond: Diamond, "file-code": FileCode2, "file-text": FileText, flag: Flag, folder: Folder, "git-branch": GitBranch,
  globe: Globe, "hard-drive": HardDrive, hexagon: Hexagon, key: KeyRound, layers: Layers, list: List, lock: Lock,
  mail: Mail, "map-pin": MapPin, "messages-square": MessagesSquare, monitor: Monitor, network: Network,
  package: Package, play: Play, puzzle: Puzzle, router: Router, rows: Rows3, scroll: Scroll, server: Server,
  shapes: Shapes, shield: Shield, smartphone: Smartphone, split: Split, square: Square, stop: CircleStop, table: Table,
  tag: Tag, terminal: Terminal, user: User, users: Users, workflow: Workflow, wrench: Wrench, zap: Zap,
};

export interface TypeMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Cor do rótulo de tipo e do ícone. */
  ink: string;
  /** Fundo do card. */
  card: string;
  /** null = raiz, "*" = qualquer lugar. */
  parents: (string | null)[];
  /** Ator ou peça de fora: o plano não implementa. */
  context: boolean;
  openable: boolean;
  /** false = começa fechado mesmo quando muda (ex.: component no c4, para o código ficar fechado). */
  autoOpen: boolean;
  /** Nome do nível quando o diagrama está focado dentro deste tipo. */
  inside?: string;
  /** Ícone inferido da tecnologia (web, mobile, API, worker). */
  iconByTech: boolean;
}

export interface Notation {
  name: string;
  label: string;
  description: string;
  root: string;
  /** Sentido do desenho: DOWN (padrão) ou RIGHT. */
  direction: "DOWN" | "RIGHT";
  summary: { label: string; types: string[] }[];
  parts: string[];
  types: Map<string, TypeMeta>;
}

type Preset = (typeof presets.notations)[keyof typeof presets.notations];
const PRESETS = presets.notations as Record<string, Preset>;
const COLORS = presets.colors as Record<string, string>;
const CARDS = presets.cards as Record<string, string>;
export const DEFAULT_NOTATION = "c4";
export const NOTATION_NAMES = Object.keys(PRESETS);

const color = (c: string | undefined) => (c && (COLORS[c] ?? (/^#[0-9a-f]{6}$/i.test(c) ? c : undefined))) ?? COLORS.gray;

function toMeta(id: string, t: Partial<TypeDef>): TypeMeta {
  return {
    id,
    label: t.label ?? id,
    icon: (t.icon && ICONS[t.icon]) || Square,
    ink: color(t.color),
    card: CARDS[t.card ?? "base"] ?? CARDS.base,
    parents: t.parents?.length ? t.parents : ["*"],
    context: !!t.context,
    openable: !!t.openable,
    autoOpen: t.autoOpen ?? true,
    inside: t.inside,
    iconByTech: !!(t as { iconByTech?: boolean }).iconByTech,
  };
}

/** Preset de `notation` (c4 por padrão) mais os `types` do documento; um tipo próprio substitui o do preset. */
export function resolveNotation(doc: Pick<ArchDoc, "notation" | "types">): Notation {
  const name = doc.notation && PRESETS[doc.notation] ? doc.notation : DEFAULT_NOTATION;
  const p = PRESETS[name];
  const types = new Map<string, TypeMeta>();
  for (const [id, t] of Object.entries(p.types)) types.set(id, toMeta(id, t as Partial<TypeDef>));
  for (const t of doc.types ?? []) if (t?.id) types.set(t.id, toMeta(t.id, t));
  return { name, label: p.label, description: p.description, root: p.root, direction: (p as { direction?: string }).direction === "RIGHT" ? "RIGHT" : "DOWN", summary: p.summary, parts: p.parts, types };
}

/** Tipo desconhecido não quebra: cai num estilo neutro com o próprio id como rótulo. */
export function typeMeta(n: Notation, type: string): TypeMeta {
  return n.types.get(type) ?? toMeta(type, {});
}

/** Nome do nível aberto (null = visão geral). */
export function levelLabel(n: Notation, focusType: string | null): string {
  if (!focusType) return n.root;
  return n.types.get(focusType)?.inside ?? "Detalhe";
}

/** Contadores do resumo: os do preset, ou os 3 tipos mais comuns quando o preset não cobre o documento. */
export function summaryStats(n: Notation, types: string[]): [string, number][] {
  const count = (ts: string[]) => types.filter((t) => ts.includes(t)).length;
  const preset = n.summary.map((s) => [s.label, count(s.types)] as [string, number]);
  if (preset.some(([, c]) => c > 0)) return preset;
  const freq = new Map<string, number>();
  for (const t of types) freq.set(t, (freq.get(t) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, c]) => [typeMeta(n, t).label, c]);
}
