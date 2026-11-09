import { describe, expect, it } from "vitest";
import { isEmbed } from "./embed";

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
