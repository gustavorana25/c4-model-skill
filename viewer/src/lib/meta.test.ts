import { AppWindow, Box, Cog, Database, Server, Smartphone } from "lucide-react";
import { describe, expect, test } from "vitest";
import { elementIcon } from "./meta";
import type { ArchElement } from "./types";

const c = (name: string, tech?: string, type: ArchElement["type"] = "container"): ArchElement => ({ id: "x", type, name, tech });

describe("elementIcon", () => {
  test.each([
    [c("Web App", "Next.js"), AppWindow],
    [c("Checkout API", "Node.js / Fastify"), Server],
    [c("Order Worker", "Node.js"), Cog],
    [c("App do cliente", "React Native"), Smartphone],
    [c("Painel", "Vue"), AppWindow],
    [c("Motor de regras", "Go"), Box], // sem pista: ícone genérico de container
    [c("Orders DB", "PostgreSQL", "database"), Database], // só containers são inferidos
  ])("%o", (el, icon) => expect(elementIcon(el)).toBe(icon));
});
