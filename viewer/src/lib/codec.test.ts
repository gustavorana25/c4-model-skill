import { readFileSync, writeFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";
import { buildHash, decodeHash, encodeDoc } from "./codec";
import type { ArchDoc } from "./types";

const here = (p: string) => new URL(p, import.meta.url);
const example = load(readFileSync(here("../../../skills/c4-plan/examples/pix.arch.yaml"), "utf8")) as ArchDoc;

describe("codec", () => {
  test("lê hash gerado pelo arch_url.py (Python)", async () => {
    const hash = readFileSync(here("./__fixtures__/pix.python.hash.txt"), "utf8").trim();
    const { doc, focus } = await decodeHash(hash);
    expect(doc).toEqual(example);
    expect(focus).toBeNull();
  });

  test("ida e volta preserva o documento e a view", async () => {
    const url = "https://viewer.dev/" + buildHash(await encodeDoc(example), "checkout-api");
    const { doc, focus } = await decodeHash(url);
    expect(doc).toEqual(example);
    expect(focus).toBe("checkout-api");
  });

  test("rejeita versão desconhecida e hash sem prefixo", async () => {
    await expect(decodeHash("#v2.abc")).rejects.toThrow(/v2/);
    await expect(decodeHash("#abc")).rejects.toThrow(/prefixo/);
  });

  // Gera a fixture que o teste Python usa para conferir o caminho inverso (TS -> Python).
  test("escreve fixture para o teste Python", async () => {
    const edited = structuredClone(example);
    edited.approved = true;
    writeFileSync(here("./__fixtures__/pix.ts.hash.txt"), buildHash(await encodeDoc(edited), "loja") + "\n");
  });
});
