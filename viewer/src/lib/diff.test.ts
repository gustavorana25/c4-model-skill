import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";
import { diffDocs, reviewables } from "./diff";
import { buildModel } from "./model";
import type { ArchDoc, ArchElement } from "./types";

const base = load(readFileSync(new URL("../../../examples/pix.arch.yaml", import.meta.url), "utf8")) as ArchDoc;
const find = (d: ArchDoc, id: string): ArchElement => {
  const walk = (els: ArchElement[]): ArchElement | undefined => {
    for (const e of els) {
      if (e.id === id) return e;
      const f = e.children && walk(e.children);
      if (f) return f;
    }
  };
  return walk(d.elements)!;
};

describe("diffDocs", () => {
  test("sem edição, sem mudanças", () => expect(diffDocs(base, structuredClone(base))).toEqual([]));

  test("detecta liberdade, restrições e notas", () => {
    const cur = structuredClone(base);
    const pix = find(cur, "pix-handler");
    pix.detail = "delegated";
    pix.constraints = [...pix.constraints!.filter((c) => !c.startsWith("QR")), "Timeout de 5s"];
    pix.notes = "Avaliar retry";
    pix.reviewed = true; // revisão não conta como alteração
    const kinds = diffDocs(base, cur).map((c) => c.kind).sort();
    expect(kinds).toEqual(["constraint-add", "constraint-del", "detail", "notes"]);
    expect(diffDocs(base, cur).find((c) => c.kind === "detail")).toMatchObject({ from: "guided", to: "delegated" });
  });
});

describe("reviewables", () => {
  test("só elementos implementáveis que o plano toca", () => {
    const ids = reviewables(buildModel(base)).map((e) => e.id).sort();
    expect(ids).toEqual([
      "checkout-api", "order-worker", "orders-db", "payment-events", "payment-router", "pix-handler", "web-app", "webhook-receiver",
    ]);
  });
});
