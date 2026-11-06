// Espelha schema/arch.v1.json
export type ElementType = "person" | "system" | "external" | "container" | "database" | "queue" | "component" | "code";
export type Status = "new" | "changed" | "removed" | "unchanged";
export type Detail = "locked" | "guided" | "delegated";

export interface ArchElement {
  id: string;
  type: ElementType;
  name: string;
  description?: string;
  tech?: string;
  /** Arquivo no repositório; usado principalmente em code (nível 4). */
  path?: string;
  status?: Status;
  detail?: Detail;
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

export interface ArchDoc {
  version: 1;
  plan: string;
  description?: string;
  approved?: boolean;
  elements: ArchElement[];
  relations?: Relation[];
  steps?: Step[];
}
