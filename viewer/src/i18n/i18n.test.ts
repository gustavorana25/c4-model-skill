import { describe, expect, it } from "vitest";
import presets from "../../../skills/blueroll/schema/notations.json";
import translations from "../../../skills/blueroll/schema/notations.i18n.json";
import { buildModel } from "../lib/model";
import { levelLabel, resolveNotation, summaryStats, typeMeta } from "../lib/notation";
import { en } from "./en";
import { es } from "./es";
import { normalizeLang, translate } from "./index";
import { ptBR } from "./pt-BR";

describe("dicionários", () => {
  it("en e es têm as mesmas chaves do pt-BR", () => {
    const keys = Object.keys(ptBR).sort();
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(es).sort()).toEqual(keys);
  });
  it("plural e variáveis", () => {
    expect(translate("pt-BR", "flows.hops", 1)).toBe("1 salto");
    expect(translate("en", "flows.hops", 3)).toBe("3 hops");
    expect(translate("es", "side.openChildren", 2)).toBe("Abrir 2 elementos internos");
  });
  it("idioma do navegador", () => {
    expect(normalizeLang("pt-PT")).toBe("pt-BR");
    expect(normalizeLang("es-AR")).toBe("es");
    expect(normalizeLang("en-GB")).toBe("en");
    expect(normalizeLang("fr")).toBeNull();
  });
});

describe("notações traduzidas", () => {
  const T = translations as unknown as Record<string, Record<string, { label: string; description: string; root: string; summary: string[]; types: Record<string, { label: string; inside?: string }> }>>;
  for (const lang of ["en", "es"] as const)
    for (const [name, p] of Object.entries(presets.notations)) {
      it(`${lang}: ${name} completa`, () => {
        const tr = T[lang][name];
        expect(tr, "notação sem tradução").toBeTruthy();
        expect(tr.label && tr.description && tr.root).toBeTruthy();
        expect(tr.summary).toHaveLength(p.summary.length);
        for (const [id, t] of Object.entries(p.types)) {
          expect(tr.types[id]?.label, `${id} sem label`).toBeTruthy();
          expect(!!tr.types[id]?.inside, `${id}: inside`).toBe(!!(t as { inside?: string }).inside);
        }
      });
    }

  it("c4 em inglês", () => {
    const n = resolveNotation({ notation: "c4" }, "en");
    expect(n.root).toBe("Level 1 · Context");
    expect(typeMeta(n, "container").label).toBe("Container");
    expect(levelLabel(n, "system")).toBe("Level 2 · Containers");
    expect(levelLabel(n, "code")).toBe("Detail");
    expect(summaryStats(n, ["container", "component"])[0]).toEqual(["Containers", 1]);
  });
  it("tipo próprio fica como o autor escreveu", () => {
    const n = resolveNotation({ notation: "infra", types: [{ id: "papel", label: "Papel IAM" }] }, "en");
    expect(typeMeta(n, "papel").label).toBe("Papel IAM");
    expect(typeMeta(n, "banco").label).toBe("Database");
  });
  it("problemas no idioma pedido", () => {
    const m = buildModel({ version: 1, title: "x", elements: [], relations: [{ from: "a", to: "b" }] }, "es");
    expect(m.problems[0]).toContain("no existe");
  });
});
