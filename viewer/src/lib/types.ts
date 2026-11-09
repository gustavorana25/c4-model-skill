// Espelha skills/blueroll/schema/arch.v1.json
/** Um tipo da notação do documento (em c4: person, system, external, container, database, queue, component, code) ou de types. */
export type ElementType = string;
export type Status = "new" | "changed" | "removed" | "unchanged";

export interface ArchElement {
  id: string;
  type: ElementType;
  name: string;
  description?: string;
  tech?: string;
  /** Arquivo no repositório; usado principalmente em code (nível 4). */
  path?: string;
  /** Ícone deste elemento (nome da lista icons em notations.json); vence o do tipo e o inferido. */
  icon?: string;
  status?: Status;
  constraints?: string[];
  notes?: string;
  /** Marcado pelo humano no viewer. */
  reviewed?: boolean;
  children?: ArchElement[];
}

export interface Relation {
  from: string;
  to: string;
  label?: string;
  protocol?: string;
  status?: Status;
  contract?: string;
}

export interface Step {
  id: string;
  title: string;
  description?: string;
  touches: string[];
}

/** Um salto de um fluxo: segue uma relação (no sentido dela, ou no contrário para uma resposta). */
export interface Hop {
  from: string;
  to: string;
  label?: string;
}

/** Como o sistema funciona depois do plano: o caminho de uma ação de ponta a ponta. */
export interface Flow {
  id: string;
  title: string;
  description?: string;
  hops: Hop[];
}

/** plan: o que um plano muda (padrão). system: o sistema como é hoje (documentação). */
export type DocKind = "plan" | "system";

/** Tipo próprio declarado no documento (soma ou substitui os do preset). */
export interface TypeDef {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  card?: "base" | "raised" | "deep";
  parents?: (string | null)[];
  context?: boolean;
  openable?: boolean;
  autoOpen?: boolean;
  inside?: string;
  /** Marca d’água do card: cylinder ou queue. */
  mark?: "cylinder" | "queue";
}

export interface ArchDoc {
  version: 1;
  kind?: DocKind;
  /** Vocabulário de tipos (presets em notations.json); padrão c4. */
  notation?: string;
  /** Idioma em que o documento foi escrito (pt-BR, en, es). O viewer usa o idioma de quem abre. */
  lang?: string;
  types?: TypeDef[];
  /** Título; em kind: plan, plan também serve. */
  title?: string;
  plan?: string;
  description?: string;
  approved?: boolean;
  elements: ArchElement[];
  relations?: Relation[];
  steps?: Step[];
  flows?: Flow[];
}
