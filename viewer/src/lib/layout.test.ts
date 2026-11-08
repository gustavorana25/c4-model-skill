import { load } from "js-yaml";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutView } from "./layout";
import { buildModel } from "./model";
import type { ArchDoc } from "./types";
import { computeView, defaultExpanded } from "./view";

const example = (name: string) =>
  load(readFileSync(new URL(`../../../skills/blueroll/examples/${name}`, import.meta.url), "utf8")) as ArchDoc;

/** Posição absoluta de cada caixa depois do layout. */
async function positions(doc: ArchDoc, expanded: Set<string>) {
  const m = buildModel(doc);
  const view = computeView(doc, m, null, expanded);
  const { nodes } = await layoutView(view, m.notation.direction, [...m.index.keys()]);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const abs = (id: string): { x: number; y: number } => {
    const n = byId.get(id)!;
    const p = n.parentId ? abs(n.parentId) : { x: 0, y: 0 };
    return { x: p.x + n.position.x, y: p.y + n.position.y };
  };
  return abs;
}

describe("layout com relações em ciclo", () => {
  it("2FA: o usuário fica acima do provedor de SMS, fechado ou com tudo aberto", async () => {
    const doc = example("2fa.arch.yaml");
    for (const expanded of [new Set<string>(), defaultExpanded(buildModel(doc))]) {
      const at = await positions(doc, expanded);
      expect(at("usuario").y).toBeLessThan(at("sms").y);
    }
  });

  it("jornada: a corrente da fase segue a ordem do documento, apesar do \"volta e olha outro\"", async () => {
    const at = await positions(example("jornada.arch.yaml"), new Set(["escolha"]));
    const xs = ["cliente", "inicio", "busca", "restaurante", "vale-a-pena"].map((id) => at(id).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });
});
