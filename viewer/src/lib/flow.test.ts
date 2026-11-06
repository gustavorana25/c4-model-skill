import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";
import { hopFocus, hopRelation } from "./flow";
import { flowMarks } from "./highlight";
import { buildModel } from "./model";
import type { ArchDoc } from "./types";
import { computeView } from "./view";

const doc = load(readFileSync(new URL("../../../examples/pix.arch.yaml", import.meta.url), "utf8")) as ArchDoc;
const m = buildModel(doc);
const flow = doc.flows!.find((f) => f.id === "pagar-com-pix")!;

describe("fluxos", () => {
  test("todo salto do exemplo segue uma relação", () => {
    for (const f of doc.flows!) for (const h of f.hops) expect(hopRelation(doc, h), `${f.id}: ${h.from} → ${h.to}`).not.toBeNull();
  });

  test("resposta percorre a relação no sentido contrário", () => {
    expect(hopRelation(doc, { from: "psp", to: "psp-client" })).toMatchObject({ reverse: true, rel: { from: "psp-client", to: "psp" } });
  });

  test("cada salto desce até o nível em que vira seta", () => {
    // os dois no mesmo componente: abre o componente
    expect(hopFocus(doc, m, { from: "payments-controller", to: "method-registry" })).toBe("payment-router");
    // código ↔ externo: abre o componente do código
    expect(hopFocus(doc, m, { from: "psp-client", to: "psp" })).toBe("pix-handler");
    // pessoa → código da web: abre o componente da tela
    expect(hopFocus(doc, m, { from: "cliente", to: "checkout-page-view" })).toBe("checkout-page");
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
