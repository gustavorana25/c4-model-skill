import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { _resetBridge, ask, emit, GRACE_MS, MAX_WAIT_MS, next, reply, stop } from "./bridge";
import { useStore } from "./store";

const listening = () => useStore.getState().listening;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "info").mockImplementation(() => {});
  _resetBridge();
  useStore.setState({ listening: false, everListened: false, messages: [] });
});
afterEach(() => vi.useRealTimers());

describe("next()", () => {
  test("devolve null quando o tempo acaba", async () => {
    const p = next(1000);
    expect(listening()).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(await p).toBeNull();
  });

  test("acorda na hora em que o humano faz algo", async () => {
    const p = next(30_000);
    emit({ event: "send", approved: true, changes: 2, url: "x", at: 1 });
    expect(await p).toMatchObject({ event: "send", approved: true });
  });

  test("evento sem ninguém esperando fica na fila para o próximo next()", async () => {
    emit({ event: "send", approved: false, changes: 0, url: "x", at: 1 });
    expect(await next(1000)).toMatchObject({ event: "send" });
  });

  test("nunca espera mais que o limite da ferramenta", async () => {
    const p = next(10 * 60_000);
    vi.advanceTimersByTime(MAX_WAIT_MS);
    expect(await p).toBeNull();
  });

  test("um segundo next() libera o primeiro", async () => {
    const a = next(30_000);
    const b = next(30_000);
    expect(await a).toBeNull();
    emit({ event: "send", approved: false, changes: 0, url: "x", at: 1 });
    expect(await b).toMatchObject({ event: "send" });
  });
});

describe("indicador de escuta", () => {
  test("continua ligado logo após um retorno e desliga depois da carência", async () => {
    const p = next(1000);
    vi.advanceTimersByTime(1000);
    await p;
    expect(listening()).toBe(true); // agente está processando entre duas chamadas
    expect(useStore.getState().everListened).toBe(true);
    vi.advanceTimersByTime(GRACE_MS + 10);
    emit({ event: "send", approved: false, changes: 0, url: "x", at: 1 }); // força um refresh
    expect(listening()).toBe(false);
  });

  test("stop() desliga na hora e libera quem espera", async () => {
    const p = next(30_000);
    stop();
    expect(await p).toBeNull();
    expect(listening()).toBe(false);
  });
});

describe("perguntas", () => {
  test("ask() registra a mensagem, acorda o agente e recebe resposta", async () => {
    const p = next(30_000);
    const msg = ask("ask", "orders-db", "precisa de fila aqui?");
    const ev = await p;
    expect(ev).toMatchObject({ event: "ask", messageId: msg.id, elementId: "orders-db", text: "precisa de fila aqui?" });
    expect(reply(msg.id, "Sim, para desacoplar o webhook.")).toBe(true);
    expect(useStore.getState().messages[0].reply).toBe("Sim, para desacoplar o webhook.");
    expect(reply("nao-existe", "x")).toBe(false);
  });
});
