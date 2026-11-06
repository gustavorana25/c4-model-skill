import { Bot, HelpCircle, Loader2, Shuffle } from "lucide-react";
import { useState } from "react";
import { ask } from "../../bridge";
import { useStore } from "../../store";
import { Button, SectionTitle, cn } from "../ui";

/** Perguntas e pedidos de mudança sobre um elemento, para o agente que está escutando a página. */
export function TalkToAI({ elementId }: { elementId: string }) {
  const listening = useStore((s) => s.listening);
  const ever = useStore((s) => s.everListened);
  const messages = useStore((s) => s.messages).filter((m) => m.elementId === elementId);
  const [text, setText] = useState("");

  // Sem nenhum agente nesta sessão: a seção não aparece (o viewer pode estar num navegador comum).
  if (!ever && !messages.length) return null;

  const send = (kind: "ask" | "change") => {
    const v = text.trim();
    if (!v || !listening) return;
    ask(kind, elementId, v);
    setText("");
  };

  return (
    <section>
      <SectionTitle>Falar com a IA</SectionTitle>
      {messages.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {messages.map((m) => (
            <li key={m.id} className="flex flex-col gap-1.5">
              <div className="self-end rounded-xl rounded-br-sm bg-accent-bg px-3 py-2 text-[13px] text-fg">
                <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-accent-ink">
                  {m.kind === "ask" ? "Pergunta" : "Pedido de mudança"}
                </span>
                {m.text}
              </div>
              {m.reply ? (
                <div className="flex gap-2 rounded-xl rounded-bl-sm border border-line bg-[#121824] px-3 py-2 text-[13px] leading-relaxed text-fg-2">
                  <Bot size={15} className="mt-0.5 shrink-0 text-d-delegated" />
                  <span className="whitespace-pre-line">{m.reply}</span>
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-[12px] text-subtle">
                  {listening ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> A IA está vendo isso…
                    </>
                  ) : (
                    "Sem resposta: a IA não está escutando. Ela vai ver isso quando você voltar ao chat."
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <label htmlFor={`ask-${elementId}`} className="sr-only">
        Mensagem para a IA
      </label>
      <textarea
        id={`ask-${elementId}`}
        rows={2}
        value={text}
        disabled={!listening}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && send("ask")}
        placeholder={listening ? "Ex.: precisa mesmo de fila aqui?" : "A IA não está escutando agora."}
        className={cn(
          "w-full resize-y rounded-[10px] border border-line-strong bg-canvas px-3 py-2.5 text-[13px] text-fg placeholder:text-subtle",
          "focus:border-accent-soft focus:outline-none focus:ring-2 focus:ring-[rgba(110,155,255,.25)] disabled:opacity-60",
        )}
      />
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" disabled={!listening || !text.trim()} onClick={() => send("ask")}>
          <HelpCircle size={14} /> Perguntar
        </Button>
        <Button variant="outline" size="sm" className="flex-1" disabled={!listening || !text.trim()} onClick={() => send("change")}>
          <Shuffle size={14} /> Pedir mudança
        </Button>
      </div>
      {!listening && (
        <p className="mt-2 text-[12px] leading-relaxed text-subtle">
          Para comentar sem a IA ouvindo agora, use as notas acima: elas vão junto quando você enviar.
        </p>
      )}
    </section>
  );
}
