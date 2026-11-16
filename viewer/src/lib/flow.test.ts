import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";
import { groupOf, hopGroups, hopRelation, hopVisible } from "./flow";
import { flowMarks } from "./highlight";
import { buildModel } from "./model";
import type { ArchDoc } from "./types";
import { computeView, defaultExpanded, revealing } from "./view";

const doc = load(readFileSync(new URL("../../../skills/blueroll/examples/pix.arch.yaml", import.meta.url), "utf8")) as ArchDoc;
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

describe("passos com as caixas fechadas", () => {
  const closed = computeView(doc, m, null, new Set());
  const open = (() => {
    let exp = defaultExpanded(m);
    for (const h of flow.hops) exp = revealing(m, revealing(m, exp, h.from), h.to);
    return computeView(doc, m, null, exp);
  })();

  test("saltos seguidos no mesmo card (ou na mesma seta) viram um passo", () => {
    const groups = hopGroups(closed, flow.hops);
    expect(groups.length).toBeLessThan(flow.hops.length);
    // cobre todos os saltos, em ordem, sem buraco
    expect(groups[0][0]).toBe(0);
    expect(groups.at(-1)![1]).toBe(flow.hops.length - 1);
    groups.slice(1).forEach(([a], i) => expect(a).toBe(groups[i][1] + 1));
    // dentro de um passo, todo salto cai no mesmo lugar; ou o passo entra num card por uma seta e continua lá dentro
    for (const [a, b] of groups) {
      const where = (i: number) => [closed.toVisible(flow.hops[i].from), closed.toVisible(flow.hops[i].to)];
      const [x, y] = where(a);
      for (let i = a + 1; i <= b; i++) {
        const [p, q] = where(i);
        const same = p === x && q === y;
        const insideEntered = x !== y && p === y && q === y;
        expect(same || insideEntered, `salto ${i + 1}: ${p}>${q} no passo que começa em ${x}>${y}`).toBe(true);
      }
    }
  });

  test("a seta que entra num card fechado se junta aos saltos lá dentro", () => {
    const d = {
      version: 1,
      plan: "x",
      elements: [
        { id: "web", type: "container", name: "Web" },
        { id: "api", type: "container", name: "API", children: [
          { id: "ctrl", type: "component", name: "Ctrl" },
          { id: "repo", type: "component", name: "Repo" },
          { id: "svc", type: "component", name: "Svc" },
        ] },
        { id: "fila", type: "queue", name: "Fila" },
      ],
      relations: [
        { from: "web", to: "ctrl" },
        { from: "ctrl", to: "svc" },
        { from: "svc", to: "repo" },
        { from: "repo", to: "fila" },
      ],
      flows: [{ id: "f", title: "F", hops: [
        { from: "web", to: "ctrl" },
        { from: "ctrl", to: "svc" },
        { from: "svc", to: "repo" },
        { from: "repo", to: "fila" },
      ] }],
    } as unknown as ArchDoc;
    const dm = buildModel(d);
    const v = computeView(d, dm, null, new Set());
    const hops = d.flows![0].hops;
    // entra na API e faz duas coisas lá dentro: um passo; sair para a fila é outro
    expect(hopGroups(v, hops)).toEqual([[0, 2], [3, 3]]);
    expect(flowMarks(d, v, "f", 2, 0)!.insideNode).toBe("api");
    // só a seta de entrada não é "dentro" de nada
    expect(flowMarks(d, v, "f", 0, 0)!.insideNode).toBeNull();
    // com a API aberta, cada salto é uma seta entre cards diferentes
    expect(hopGroups(computeView(d, dm, null, new Set(["api"])), hops)).toEqual(hops.map((_, i) => [i, i]));
  });

  test("com tudo aberto, cada salto é um passo", () => {
    expect(hopGroups(open, flow.hops)).toEqual(flow.hops.map((_, i) => [i, i]));
  });

  test("groupOf acha o passo de um salto", () => {
    const groups: [number, number][] = [[0, 0], [1, 3], [4, 4]];
    expect(groupOf(groups, 2)).toEqual([1, 3]);
    expect(groupOf(groups, 4)).toEqual([4, 4]);
  });

  test("o passo inteiro fica aceso, e dentro de uma caixa só vira insideNode", () => {
    const [a, b] = hopGroups(closed, flow.hops).find(([x, y]) => y > x)!;
    const marks = flowMarks(doc, closed, flow.id, b, a)!;
    const vis = new Set(flow.hops.slice(a, b + 1).flatMap((h) => [closed.toVisible(h.from), closed.toVisible(h.to)]));
    for (const id of vis) expect(marks.activeNodes.has(id!)).toBe(true);
    const [x, y] = [closed.toVisible(flow.hops[a].from), closed.toVisible(flow.hops[a].to)];
    // tudo numa caixa só, ou entrou nela por uma seta e continuou lá dentro
    expect(marks.insideNode).toBe(vis.size === 1 ? [...vis][0] : x !== y && flow.hops.slice(a + 1, b + 1).every((h) => closed.toVisible(h.from) === y && closed.toVisible(h.to) === y) ? y : null);
  });
});
