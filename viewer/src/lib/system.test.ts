import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";
import { hopRelation, hopVisible } from "./flow";
import { buildModel, docHasChanges, isSystemDoc, parseDoc, titleOf } from "./model";
import type { ArchDoc } from "./types";
import { computeView, revealing } from "./view";

const read = (f: string) => load(readFileSync(new URL(`../../../examples/${f}`, import.meta.url), "utf8")) as ArchDoc;
const loja = read("loja.arch.yaml");
const pix = read("pix.arch.yaml");

describe("documentação do sistema (kind: system)", () => {
  test("título vem de title; plano continua usando plan", () => {
    expect(isSystemDoc(loja)).toBe(true);
    expect(titleOf(loja)).toBe("Loja Online");
    expect(isSystemDoc(pix)).toBe(false);
    expect(titleOf(pix)).toBe(pix.plan);
  });

  test("aceita title ou plan, e recusa sem nenhum", () => {
    expect(() => parseDoc({ version: 1, title: "X", elements: [] })).not.toThrow();
    expect(() => parseDoc({ version: 1, elements: [] })).toThrow(/title/);
  });

  test("sem mudanças: o viewer esconde legenda e filtros", () => {
    expect(docHasChanges(loja, buildModel(loja))).toBe(false);
    expect(docHasChanges(pix, buildModel(pix))).toBe(true);
  });

  test("os fluxos do exemplo seguem relações e viram setas", () => {
    const m = buildModel(loja);
    for (const f of loja.flows!)
      for (const h of f.hops) {
        expect(hopRelation(loja, h), `${f.id}: ${h.from} → ${h.to}`).not.toBeNull();
        const exp = revealing(m, revealing(m, new Set(), h.from), h.to);
        expect(hopVisible(computeView(loja, m, null, exp), h), `${f.id}: ${h.from} → ${h.to}`).toBe(true);
      }
  });
});
