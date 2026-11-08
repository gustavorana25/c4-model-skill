import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";
import { hopRelation, hopVisible } from "./flow";
import { flowMarks } from "./highlight";
import { buildModel } from "./model";
import type { ArchDoc } from "./types";
import { computeView, defaultExpanded, revealing } from "./view";

const doc = load(readFileSync(new URL("../../../skills/c4-plan/examples/pix.arch.yaml", import.meta.url), "utf8")) as ArchDoc;
const m = buildModel(doc);
const flow = doc.flows!.find((f) => f.id === "pagar-com-pix")!;

describe("fluxos", () => {
  test("todo salto do exemplo segue uma relação", () => {
    for (const f of doc.flows!) for (const h of f.hops) expect(hopRelation(doc, h), `${f.id}: ${h.from} → ${h.to}`).not.toBeNull();
  });

  test("resposta percorre a relação no sentido contrário", () => {
    expect(hopRelation(doc, { from: "psp", to: "psp-client" })).toMatchObject({ reverse: true, rel: { from: "psp-client", to: "psp" } });
  });

  test("abrir as caixas das duas pontas transforma cada salto em seta", () => {
    for (const f of doc.flows!)
      for (const h of f.hops) {
        const exp = revealing(m, revealing(m, defaultExpanded(m), h.from), h.to);
        expect(hopVisible(computeView(doc, m, null, exp), h), `${f.id}: ${h.from} → ${h.to}`).toBe(true);
      }
  });

  test("marca os saltos já percorridos e o atual", () => {
    const v = computeView(doc, m, "loja");
    const marks = flowMarks(doc, v, flow.id, 3)!; // até POST /payments
    const webToApi = v.edges.find((e) => e.from === "web-app" && e.to === "checkout-api")!;
    expect(marks.edgeNums.get(webToApi.id)).toEqual([4]);
    expect(marks.activeEdges.has(webToApi.id)).toBe(true);
    // saltos 2 e 3 são dentro da Web App neste nível
    expect(marks.litNodes.has("web-app")).toBe(true);
    expect(flowMarks(doc, v, flow.id, 1)!.insideNode).toBe("web-app");
  });
});
