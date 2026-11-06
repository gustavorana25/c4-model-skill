import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";
import { computeDimmer } from "./highlight";
import { buildModel } from "./model";
import type { ArchDoc } from "./types";
import { computeView } from "./view";

const doc = load(readFileSync(new URL("../../../examples/pix.arch.yaml", import.meta.url), "utf8")) as ArchDoc;
const m = buildModel(doc);
const pairs = (v: ReturnType<typeof computeView>) => v.edges.map((e) => `${e.from}>${e.to}`).sort();

describe("computeView", () => {
  test("exemplo não tem problemas", () => expect(m.problems).toEqual([]));

  test("visão geral eleva relações até os elementos da raiz", () => {
    const v = computeView(doc, m, null);
    expect(v.chain).toEqual([]);
    expect(v.nodes.map((n) => n.el.id).sort()).toEqual(["cliente", "gateway-cartao", "loja", "psp"]);
    expect(pairs(v)).toEqual(["cliente>loja", "loja>gateway-cartao", "loja>psp", "psp>loja"]);
    // loja -> psp agrega só "cria cobrança"; status novo
    expect(v.edges.find((e) => e.from === "loja" && e.to === "psp")!.status).toBe("new");
  });

  test("view de container mostra filhos, externos conectados e boundary", () => {
    const v = computeView(doc, m, "loja");
    expect(v.chain).toEqual(["loja"]);
    expect([...v.inside].sort()).toEqual(["checkout-api", "order-worker", "orders-db", "payment-events", "web-app"]);
    expect(v.nodes.find((n) => n.el.id === "psp")!.container).toBeNull();
    expect(v.nodes.find((n) => n.el.id === "web-app")!.container).toBe("loja");
    expect(pairs(v)).toContain("checkout-api>psp");
    expect(pairs(v)).toContain("checkout-api>orders-db");
  });

  test("view de componentes aninha boundaries e mostra irmãos conectados", () => {
    const v = computeView(doc, m, "checkout-api");
    expect(v.chain).toEqual(["loja", "checkout-api"]);
    expect(pairs(v)).toContain("pix-handler>psp");
    expect(pairs(v)).toContain("web-app>payment-router");
    expect(pairs(v)).not.toContain("cliente>web-app"); // não toca o foco
    expect(v.nodes.find((n) => n.el.id === "web-app")!.container).toBe("loja");
    expect(v.nodes.find((n) => n.el.id === "pix-handler")!.container).toBe("checkout-api");
  });
});

describe("computeDimmer", () => {
  test("passo fixado apaga o que ele não toca", () => {
    const v = computeView(doc, m, "loja");
    const d = computeDimmer(doc, m, v, "s2", false); // PIX Handler + PSP
    expect(d.node("checkout-api")).toBe(false);
    expect(d.node("psp")).toBe(false);
    expect(d.node("web-app")).toBe(true);
  });

  test("só mudanças apaga o que está inalterado", () => {
    const v = computeView(doc, m, null);
    const d = computeDimmer(doc, m, v, null, true);
    expect(d.node("gateway-cartao")).toBe(true);
    expect(d.node("loja")).toBe(false);
  });
});
