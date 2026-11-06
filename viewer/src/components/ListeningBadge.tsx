import { useStore } from "../store";
import { cn } from "./ui";

/** "IA escutando" enquanto um agente chama window.c4plan.next(); some se nenhum agente nunca escutou. */
export function ListeningBadge() {
  const listening = useStore((s) => s.listening);
  const ever = useStore((s) => s.everListened);
  if (!listening && !ever) return null;
  return (
    <span
      role="status"
      title={
        listening
          ? "Perguntas e pedidos feitos aqui chegam à IA agora, e a resposta aparece no próprio elemento."
          : "A IA parou de escutar esta página. Volte ao chat e diga “pronto”, ou peça para ela escutar de novo."
      }
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold",
        listening ? "bg-[rgba(70,196,106,.12)] text-st-new-ink" : "bg-chip text-muted",
      )}
    >
      <span className="relative flex size-2">
        {listening && <span className="absolute inline-flex size-full animate-ping rounded-full bg-st-new opacity-60" />}
        <span className={cn("relative inline-flex size-2 rounded-full", listening ? "bg-st-new" : "bg-subtle")} />
      </span>
      {listening ? "IA escutando" : "IA não está escutando"}
    </span>
  );
}
