import { AlertTriangle, CheckCircle2, Link2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { diffDocs, reviewables } from "../lib/diff";
import { sendToAgent } from "../bridge";
import { copyLinkForAI, flushHash } from "../hooks";
import { useStore } from "../store";
import { ChangeList } from "./sidebar/ChangesPanel";
import { Button, SectionTitle } from "./ui";

export function SendDialog() {
  const open = useStore((s) => s.sendOpen);
  const setOpen = useStore((s) => s.setSendOpen);
  const doc = useStore((s) => s.doc)!;
  const baseline = useStore((s) => s.baseline)!;
  const model = useStore((s) => s.model)!;
  const edit = useStore((s) => s.edit);
  const goto = useStore((s) => s.goto);
  const [url, setUrl] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    flushHash().then(() => setUrl(location.href));
  }, [open, doc]);

  const changes = diffDocs(baseline, doc);
  const pending = reviewables(model).filter((e) => !e.reviewed);
  const approved = !!doc.approved;

  const listening = useStore((s) => s.listening);
  const notify = useStore((s) => s.notify);

  // Com a IA escutando, o envio vai direto para ela; senão, copia o link para colar no chat.
  const send = async () => {
    if (listening) {
      await sendToAgent();
      notify(approved ? "Enviado. A IA segue no chat com a estrutura aprovada." : "Enviado. A IA vai ler suas alterações no chat.");
    } else {
      await copyLinkForAI();
    }
    setOpen(false);
  };
  const copyOnly = async () => {
    await copyLinkForAI();
    setOpen(false);
  };

  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dialog.current && setOpen(false)}
      aria-labelledby="send-title"
      className="m-auto w-[min(580px,calc(100vw-32px))] rounded-[18px] border border-line-strong bg-raised p-0 text-fg shadow-[0_24px_64px_rgba(0,0,0,.55)] backdrop:bg-[rgba(4,6,10,.72)]"
    >
      {open && (
        <div className="flex max-h-[calc(100vh-48px)] flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 id="send-title" className="text-[19px] font-semibold">
                Enviar para a IA
              </h2>
              <p className="mt-1.5 leading-relaxed text-muted">
                A IA recebe a estrutura com as suas decisões. Ela só começa a executar se a estrutura estiver aprovada.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
            <div>
              <SectionTitle>Suas alterações · {changes.length}</SectionTitle>
              {changes.length ? (
                <ChangeList changes={changes} compact />
              ) : (
                <p className="rounded-xl border border-line px-3.5 py-3 text-[13px] text-subtle">
                  Nenhuma alteração desde que o link chegou.
                </p>
              )}
            </div>

            {pending.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-[rgba(227,162,59,.28)] bg-[rgba(227,162,59,.08)] px-3.5 py-3">
                <AlertTriangle size={18} className="mt-px shrink-0 text-st-changed-ink" />
                <span className="text-[13px] leading-relaxed text-[#F3D9A8]">
                  {pending.length === 1 ? "1 elemento ainda não foi revisado: " : `${pending.length} elementos ainda não foram revisados: `}
                  {pending.slice(0, 4).map((e, i) => (
                    <span key={e.id}>
                      {i > 0 && (i === pending.length - 1 ? " e " : ", ")}
                      <button type="button" className="cursor-pointer font-semibold text-st-changed-ink underline-offset-2 hover:underline" onClick={() => goto(e.id)}>
                        {e.name}
                      </button>
                    </span>
                  ))}
                  {pending.length > 4 && ` e mais ${pending.length - 4}`}.
                </span>
              </div>
            )}

            <label htmlFor="aprovar" className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2B3B5C] bg-panel p-3.5">
              <input
                id="aprovar"
                type="checkbox"
                checked={approved}
                onChange={(e) =>
                  edit((d) => {
                    if (e.target.checked) d.approved = true;
                    else delete d.approved;
                  })
                }
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              <span>
                <b className="text-[14px]">Aprovar estrutura para execução</b>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                  Sem aprovação, a IA só lê suas alterações e devolve um diagrama novo para revisar.
                </span>
              </span>
            </label>

            <div>
              <SectionTitle>Link</SectionTitle>
              <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-canvas px-3 py-2.5">
                <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">{url}</code>
                <span className="shrink-0 text-[12px] text-subtle">{url.length.toLocaleString("pt-BR")} caracteres</span>
              </div>
              <p className="mt-2 text-[12.5px] text-subtle">O estado fica só no link: nada é enviado a um servidor.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line px-6 py-4">
            {listening && (
              <Button variant="ghost" size="lg" className="mr-auto" onClick={copyOnly} title="Para colar em outro lugar">
                <Link2 size={16} /> Só copiar o link
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              Continuar revisando
            </Button>
            <Button variant="primary" size="lg" onClick={send}>
              {listening ? <Send size={16} /> : approved ? <CheckCircle2 size={16} /> : <Link2 size={16} />}
              {listening
                ? approved
                  ? "Enviar aprovado para a IA"
                  : "Enviar para a IA revisar"
                : approved
                  ? "Copiar link aprovado"
                  : "Copiar link para revisão"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
