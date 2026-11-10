import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { _resetBridge, comment, commentText, emit, GRACE_MS, IDLE_MS, MAX_WAIT_MS, next, stop, touch } from "./bridge";
import * as hooks from "./hooks";
import { useStore } from "./store";

const listening = () => useStore.getState().listening;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "info").mockImplementation(() => {});
  _resetBridge();
  useStore.setState({ listening: false, everListened: false, model: null, focus: null, toast: null });
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
    emit({ event: "comment", targets: [], view: null, text: "x", at: 1 });
    expect(await p).toMatchObject({ event: "comment", text: "x" });
  });

  test("evento sem ninguém esperando fica na fila para o próximo next()", async () => {
    emit({ event: "comment", targets: [], view: null, text: "x", at: 1 });
    expect(await next(1000)).toMatchObject({ event: "comment" });
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
    emit({ event: "comment", targets: [], view: null, text: "x", at: 1 });
    expect(await b).toMatchObject({ event: "comment" });
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
    emit({ event: "comment", targets: [], view: null, text: "x", at: 1 }); // força um refresh
    expect(listening()).toBe(false);
  });

  test("stop() desliga na hora e libera quem espera", async () => {
    const p = next(30_000);
    stop();
    expect(await p).toBeNull();
    expect(listening()).toBe(false);
  });
});

describe("inatividade", () => {
  test("a escuta acaba sozinha depois de IDLE_MS sem o humano mexer", async () => {
    let ev = null;
    for (let t = 0; t < IDLE_MS; t += MAX_WAIT_MS) {
      const p = next(MAX_WAIT_MS);
      vi.advanceTimersByTime(MAX_WAIT_MS);
      ev = await p;
      if (ev) break;
    }
    expect(ev).toMatchObject({ event: "stop", reason: "idle" });
    expect(listening()).toBe(false);
  });

  test("cada interação do humano zera o relógio", async () => {
    for (let t = 0; t < 2 * IDLE_MS; t += MAX_WAIT_MS) {
      touch();
      const p = next(MAX_WAIT_MS);
      vi.advanceTimersByTime(MAX_WAIT_MS);
      expect(await p).toBeNull();
    }
    expect(listening()).toBe(true);
  });

  test("voltar a escutar depois de parar dá a janela inteira de novo", async () => {
    vi.advanceTimersByTime(IDLE_MS * 3); // humano sumiu antes da IA começar
    const p = next(1000);
    vi.advanceTimersByTime(1000);
    expect(await p).toBeNull();
  });
});

describe("comentários", () => {
  test("com a IA escutando, vai para ela com todos os alvos", async () => {
    const p = next(30_000);
    expect(await comment(["api", "db"], "precisa de fila aqui?")).toBe("sent");
    expect(await p).toMatchObject({ event: "comment", targets: [{ id: "api" }, { id: "db" }], text: "precisa de fila aqui?" });
  });

  test("sem IA escutando, copia o texto e avisa", async () => {
    const copy = vi.spyOn(hooks, "copyText").mockResolvedValue();
    expect(await comment(["api"], "e isso?")).toBe("copied");
    expect(copy).toHaveBeenCalledWith(commentText([{ id: "api", name: "api" }], "e isso?"));
    expect(useStore.getState().toast).toMatchObject({ tone: "warn" });
  });

  test("se a IA não pegar a tempo, sai da fila e vai para a área de transferência", async () => {
    const copy = vi.spyOn(hooks, "copyText").mockResolvedValue();
    const p = next(1000);
    vi.advanceTimersByTime(1000);
    await p; // a IA está "processando" entre duas chamadas: ainda conta como escutando
    expect(await comment(["api"], "oi")).toBe("sent");
    await vi.advanceTimersByTimeAsync(GRACE_MS);
    expect(copy).toHaveBeenCalledOnce();
    const q = next(1000); // a fila ficou vazia: o comentário não chega duas vezes
    vi.advanceTimersByTime(1000);
    expect(await q).toBeNull();
  });

  test("texto para colar cita nome e id de cada alvo", () => {
    expect(commentText([{ id: "a", name: "API" }, { id: "b", name: "Fila" }, { id: "c", name: "DB" }], "x")).toBe(
      `Sobre "API" (a), "Fila" (b) e "DB" (c) no diagrama: x`,
    );
    expect(commentText([], "x")).toBe("x");
  });

  test("se uma IA já escutou esta aba, o texto copiado pede para ela voltar a escutar", async () => {
    const copy = vi.spyOn(hooks, "copyText").mockResolvedValue();
    const p = next(1000);
    vi.advanceTimersByTime(1000);
    await p;
    stop();
    expect(await comment(["api"], "e isso?")).toBe("copied");
    expect(copy).toHaveBeenCalledWith(
      `Sobre "api" (api) no diagrama: e isso?\n\nDepois de responder, volte a escutar a página do diagrama.`,
    );
  });
});
