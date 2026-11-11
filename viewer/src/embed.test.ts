import { describe, expect, it } from "vitest";
import { embedZoom, isEmbed } from "./embed";

describe("isEmbed", () => {
  it("liga com ?embed, com ou sem valor", () => {
    expect(isEmbed("?embed")).toBe(true);
    expect(isEmbed("?embed=1")).toBe(true);
    expect(isEmbed("?x=2&embed")).toBe(true);
  });
  it("fica desligado sem o parâmetro ou com 0/false", () => {
    expect(isEmbed("")).toBe(false);
    expect(isEmbed("?embedded=1")).toBe(false);
    expect(isEmbed("?embed=0")).toBe(false);
    expect(isEmbed("?embed=false")).toBe(false);
  });
});

describe("embedZoom", () => {
  it("lê o zoom mínimo do enquadramento", () => {
    expect(embedZoom("?embed&zoom=0.8")).toBe(0.8);
    expect(embedZoom("?zoom=1&embed")).toBe(1);
  });
  it("ignora valor ausente, inválido ou fora dos limites do canvas", () => {
    expect(embedZoom("?embed")).toBeUndefined();
    expect(embedZoom("?embed&zoom=")).toBeUndefined();
    expect(embedZoom("?embed&zoom=abc")).toBeUndefined();
    expect(embedZoom("?embed&zoom=0.05")).toBeUndefined();
    expect(embedZoom("?embed&zoom=3")).toBeUndefined();
  });
});
