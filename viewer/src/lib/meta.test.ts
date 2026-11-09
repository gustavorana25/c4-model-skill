import {
  AppWindow, Box, Cog, Database, FileCode2, KeyRound, MessagesSquare, Puzzle, Server, Smartphone, Table, Zap,
} from "lucide-react";
import { describe, expect, test } from "vitest";
import { elementIcon } from "./meta";
import { resolveNotation } from "./notation";
import type { ArchElement } from "./types";

const c = (name: string, tech?: string, type: ArchElement["type"] = "container"): ArchElement => ({ id: "x", type, name, tech });
const comp = (name: string, extra: Partial<ArchElement> = {}): ArchElement => ({ id: "x", type: "component", name, ...extra });
const code = (name: string, path?: string): ArchElement => ({ id: "x", type: "code", name, path });

const c4 = resolveNotation({});

describe("elementIcon", () => {
  test.each([
    [c("Web App", "Next.js"), AppWindow],
    [c("Checkout API", "Node.js / Fastify"), Server],
    [c("Order Worker", "Node.js"), Cog],
    [c("App do cliente", "React Native"), Smartphone],
    [c("Painel", "Vue"), AppWindow],
    [c("Motor de regras", "Go"), Box], // sem pista: ícone genérico de container
    [c("Orders DB", "PostgreSQL", "database"), Database], // database não é inferido
    [c("Pedidos", "Node.js / Prisma"), Box], // container não olha regras de dado
  ])("container %o", (el, icon) => expect(elementIcon(el, c4)).toBe(icon));

  test.each([
    [comp("Tabela users"), Table],
    [comp("orders table"), Table],
    [comp("Migrações"), Table],
    [comp("ChallengeRepository"), Database],
    [comp("Sessões", { tech: "Redis" }), Database],
    [comp("OrderPaid event"), Zap],
    [comp("PaymentListener"), Zap],
    [comp("Tópico de pedidos", { tech: "Kafka" }), MessagesSquare],
    [comp("Tela de login"), AppWindow],
    [comp("CheckoutPage"), AppWindow],
    [comp("OrderController"), Server],
    [comp("Review"), Puzzle], // "view" no meio da palavra não conta
    [comp("Platform"), Puzzle], // nem "form"
    [comp("Regras de frete"), Puzzle],
    [code("add_two_factor", "db/migrations/20261110_add_two_factor.sql"), Table],
    [code("User", "src/users/user.model.ts"), Database],
    [code("TwoFactorPrompt", "src/auth/TwoFactorPrompt.tsx"), AppWindow],
    [code("verifyTotp", "src/auth/two-factor/totp.ts"), FileCode2],
  ])("componente/código %o", (el, icon) => expect(elementIcon(el, c4)).toBe(icon));

  test("componente sem pista usa o tipo do pai", () => {
    expect(elementIcon(comp("Desafios de login"), c4, { parentType: "database" })).toBe(Table);
    expect(elementIcon(comp("Pedido criado"), c4, { parentType: "queue" })).toBe(Zap);
    expect(elementIcon(comp("Checkout"), c4, { parentType: "container" })).toBe(Puzzle);
  });

  test("icon do elemento vence tudo", () => {
    expect(elementIcon(comp("Tabela users", { icon: "key" }), c4, { parentType: "database" })).toBe(KeyRound);
    expect(elementIcon(comp("Tabela users", { icon: "nao-existe" }), c4)).toBe(Table);
  });
});
