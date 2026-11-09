import { Box, Database, FileCode2, Globe, Square } from "lucide-react";
import { describe, expect, test } from "vitest";
import presets from "../../../skills/blueroll/schema/notations.json";
import { ICONS, levelLabel, NOTATION_NAMES, resolveNotation, summaryStats, typeMeta } from "./notation";

describe("preset c4 igual ao comportamento de antes", () => {
  const n = resolveNotation({});
  test("é o padrão", () => expect(n.name).toBe("c4"));
  test.each([
    ["person", "Pessoa", "#9DB8FF", "#141A25"],
    ["system", "Sistema", "#8FB0FF", "#141A25"],
    ["external", "Sistema externo", "#A3ACBB", "#141A25"],
    ["container", "Container", "#6EA8FF", "#141A25"],
    ["database", "Banco", "#4FD1C5", "#141A25"],
    ["queue", "Fila", "#4FD1C5", "#141A25"],
    ["component", "Componente", "#8FC1FF", "#1A2638"],
    ["code", "Código", "#B79CFF", "#1B1F33"],
  ])("%s", (type, label, ink, card) => {
    const T = typeMeta(n, type);
    expect([T.label, T.ink, T.card]).toEqual([label, ink, card]);
  });
  test("ícones", () => {
    expect(typeMeta(n, "container").icon).toBe(Box);
    expect(typeMeta(n, "database").icon).toBe(Database);
    expect(typeMeta(n, "external").icon).toBe(Globe);
    expect(typeMeta(n, "code").icon).toBe(FileCode2);
  });
  test("níveis", () => {
    expect(levelLabel(n, null)).toBe("Nível 1 · Contexto");
    expect(levelLabel(n, "system")).toBe("Nível 2 · Containers");
    expect(levelLabel(n, "queue")).toBe("Nível 3 · Componentes");
    expect(levelLabel(n, "component")).toBe("Nível 4 · Código");
    expect(levelLabel(n, "code")).toBe("Detalhe");
  });
  test("contadores do resumo", () =>
    expect(summaryStats(n, ["container", "database", "component", "external", "person"])).toEqual([
      ["Containers", 2],
      ["Componentes", 1],
      ["Externos", 1],
    ]));
  test("só component começa fechado", () =>
    expect([...n.types.values()].filter((t) => !t.autoOpen).map((t) => t.id)).toEqual(["component"]));
});

describe("outras notações e tipos próprios", () => {
  test("preset processo", () => {
    const n = resolveNotation({ notation: "processo" });
    expect(typeMeta(n, "decisao").label).toBe("Decisão");
    expect(levelLabel(n, null)).toBe("Visão geral do processo");
    expect(levelLabel(n, "raia")).toBe("Etapas da raia");
  });
  test("tipo próprio soma ao preset e pode substituir", () => {
    const n = resolveNotation({
      notation: "infra",
      types: [
        { id: "squad", label: "Squad", icon: "users", color: "#123456" },
        { id: "servico", label: "Microsserviço" },
      ],
    });
    expect(typeMeta(n, "squad")).toMatchObject({ label: "Squad", ink: "#123456", icon: ICONS.users, parents: ["*"] });
    expect(typeMeta(n, "servico").label).toBe("Microsserviço");
    expect(typeMeta(n, "cluster").label).toBe("Cluster");
  });
  test("tipo desconhecido cai no estilo neutro", () => {
    const T = typeMeta(resolveNotation({}), "foguete");
    expect([T.label, T.icon, T.ink]).toEqual(["foguete", Square, presets.colors.gray]);
  });
  test("jornada e processo desenham da esquerda para a direita", () => {
    expect(resolveNotation({}).direction).toBe("DOWN");
    expect(resolveNotation({ notation: "jornada" }).direction).toBe("RIGHT");
    expect(resolveNotation({ notation: "processo" }).direction).toBe("RIGHT");
  });
  test("notação inexistente cai no c4", () => expect(resolveNotation({ notation: "nada" }).name).toBe("c4"));
  test("resumo sem tipos do preset usa os mais comuns", () =>
    expect(summaryStats(resolveNotation({ notation: "livre", types: [{ id: "time", label: "Time" }] }), ["time", "time"])).toEqual([
      ["Time", 2],
    ]));
});

describe("notations.json bate com o viewer", () => {
  test("lista de ícones = mapa ICONS", () => expect(Object.keys(ICONS).sort()).toEqual([...presets.icons].sort()));
  test.each(NOTATION_NAMES)("%s: ícones, cores e pais válidos", (name) => {
    const p = presets.notations[name as keyof typeof presets.notations];
    for (const [id, t] of Object.entries(p.types) as [string, { icon: string; color: string; parents: (string | null)[] }][]) {
      expect(ICONS[t.icon], `${name}.${id}.icon`).toBeDefined();
      expect(presets.colors[t.color as keyof typeof presets.colors], `${name}.${id}.color`).toBeDefined();
      for (const par of t.parents) expect(par === null || par === "*" || par in p.types, `${name}.${id}.parents ${par}`).toBe(true);
    }
    for (const s of p.summary) for (const t of s.types) expect(t in p.types).toBe(true);
    for (const t of p.parts) expect(t in p.types).toBe(true);
  });
});

describe("exemplos das notações novas", () => {
  test.each(["aws", "jornada"])("%s: tipos conhecidos e view inicial monta", async (name) => {
    const { readFileSync } = await import("node:fs");
    const { load } = await import("js-yaml");
    const { buildModel } = await import("./model");
    const { computeView, defaultExpanded } = await import("./view");
    const doc = load(readFileSync(new URL(`../../../skills/blueroll/examples/${name}.arch.yaml`, import.meta.url), "utf8")) as never;
    const m = buildModel(doc);
    expect(m.problems).toEqual([]);
    for (const el of m.index.values()) expect(m.notation.types.has(el.type), el.type).toBe(true);
    expect(computeView(doc, m, null, defaultExpanded(m)).nodes.length).toBeGreaterThan(0);
  });
});

describe("mark (marca d’água do card)", () => {
  test("banco e fila têm desenho; o resto não", () => {
    const c4 = resolveNotation({});
    expect(typeMeta(c4, "database").mark).toBe("cylinder");
    expect(typeMeta(c4, "queue").mark).toBe("queue");
    expect(typeMeta(c4, "container").mark).toBeUndefined();
    const infra = resolveNotation({ notation: "infra" });
    expect(typeMeta(infra, "banco").mark).toBe("cylinder");
    expect(typeMeta(infra, "fila").mark).toBe("queue");
  });
  test("tipo próprio pode pedir a marca; valor desconhecido é ignorado", () => {
    const n = resolveNotation({ notation: "livre", types: [{ id: "cache", label: "Cache", mark: "cylinder" }, { id: "x", label: "X", mark: "nada" as never }] });
    expect(typeMeta(n, "cache").mark).toBe("cylinder");
    expect(typeMeta(n, "x").mark).toBeUndefined();
  });
});
