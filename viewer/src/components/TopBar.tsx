import { CheckCircle2, Code2, Send } from "lucide-react";
import { reviewables } from "../lib/diff";
import { copyYaml } from "../hooks";
import { useStore } from "../store";
import { ListeningBadge } from "./ListeningBadge";
import { Button, Logo, Pill } from "./ui";

export function TopBar() {
  const doc = useStore((s) => s.doc);
  const model = useStore((s) => s.model);
  const dirty = useStore((s) => s.dirty);
  const openSend = useStore((s) => s.setSendOpen);

  const items = model ? reviewables(model) : [];
  const done = items.filter((e) => e.reviewed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <header className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-4 border-b border-line bg-panel px-5 py-2">
      <Logo />
      {doc && (
        <>
          <span className="h-6 w-px bg-[#232B3A]" />
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-[15px] font-semibold text-fg">{doc.plan}</h1>
            {doc.approved ? (
              <Pill className="bg-[rgba(70,196,106,.14)] text-st-new-ink">
                <CheckCircle2 size={12} /> Aprovado
              </Pill>
            ) : dirty ? (
              <Pill className="bg-[rgba(227,162,59,.14)] text-st-changed-ink">
                <span className="size-1.5 rounded-full bg-st-changed" /> Alterado, não enviado
              </Pill>
            ) : (
              <Pill className="bg-accent-bg text-accent-ink">
                <span className="size-1.5 rounded-full bg-accent-soft" /> Em revisão
              </Pill>
            )}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3.5">
            <ListeningBadge />
            {items.length > 0 && (
              <div className="flex items-center gap-2.5" title="Elementos que o plano cria ou altera e que você já marcou como revisados">
                <span className="text-[12px] text-muted">
                  Revisados <b className="text-fg">{done}</b> de {items.length}
                </span>
                <span className="block h-1.5 w-28 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <span className="block h-full rounded-full bg-accent-soft transition-[width]" style={{ width: `${pct}%` }} />
                </span>
              </div>
            )}
            <Button variant="outline" onClick={copyYaml} title="Copiar o documento em YAML">
              <Code2 size={16} /> YAML
            </Button>
            <Button variant="primary" onClick={() => openSend(true)}>
              <Send size={16} /> Enviar para a IA
            </Button>
          </div>
        </>
      )}
    </header>
  );
}
