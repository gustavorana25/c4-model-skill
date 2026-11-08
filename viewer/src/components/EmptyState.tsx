import { load } from "js-yaml";
import { AlertTriangle, ArrowRight, Boxes, Cloud, Route, type LucideIcon } from "lucide-react";
import { useState } from "react";
import pixYaml from "../../../skills/blueroll/examples/pix.arch.yaml?raw";
import awsYaml from "../../../skills/blueroll/examples/aws.arch.yaml?raw";
import jornadaYaml from "../../../skills/blueroll/examples/jornada.arch.yaml?raw";
import { useStore } from "../store";
import { Button, cn } from "./ui";

const STEPS = [
  ["A IA propõe", "Gera o diagrama a partir do plano, com o que é novo, alterado ou removido."],
  ["Você entende", "Vê como o plano afeta o que existe hoje, descendo de nível só onde importa."],
  ["Você comenta", "Aponta os cards e pergunta ou pede mudança. A conversa e a aprovação ficam no chat."],
];

const EXAMPLES: { title: string; kind: string; desc: string; icon: LucideIcon; yaml: string }[] = [
  { title: "Pagamento via PIX", kind: "Plano · C4", desc: "O que um plano cria e altera, do contexto até o código.", icon: Boxes, yaml: pixYaml },
  { title: "Entidades da AWS", kind: "Informativo · Infra", desc: "O papel de cada serviço, quem fala com quem e as permissões.", icon: Cloud, yaml: awsYaml },
  { title: "Jornada num app de delivery", kind: "Informativo · Jornada", desc: "Da tela inicial ao entregador no mapa, com os pontos de saída.", icon: Route, yaml: jornadaYaml },
];

export function EmptyState() {
  const loadDoc = useStore((s) => s.load);
  const loadError = useStore((s) => s.loadError);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const render = (src: string) => {
    try {
      loadDoc(load(src));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto bg-canvas bg-[radial-gradient(#1A2130_1px,transparent_1px)] [background-size:22px_22px] px-5 py-12">
      <div className="flex w-full max-w-[720px] flex-col gap-7">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-fg">
            Veja o que o plano muda
            <br />antes de virar código.
          </h1>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-muted">
            Abra o link que a IA gerou para o seu plano, ou cole o YAML aqui para ver o diagrama.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="flex flex-col gap-2 rounded-[14px] border border-[#222A39] bg-raised p-4">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-bg text-[13px] font-bold text-accent-ink">{i + 1}</span>
              <b className="text-[14px] text-fg">{t}</b>
              <span className="text-[13px] leading-relaxed text-muted">{d}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3.5 rounded-2xl border border-line-strong bg-raised p-5">
          {(loadError || err) && (
            <div className="flex items-start gap-2 rounded-[10px] border border-[rgba(242,104,95,.35)] bg-[rgba(242,104,95,.1)] px-3 py-2.5 text-[13px] text-[#FFC9C4]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err ?? loadError}
            </div>
          )}
          <label htmlFor="yaml" className="text-[13px] font-semibold text-fg-2">
            YAML ou JSON do plano
          </label>
          <textarea
            id="yaml"
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onDragOver={(e) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) render(await f.text());
            }}
            placeholder={"version: 1\nplan: Meu plano\nelements:\n  - id: api\n    type: container\n    name: API"}
            className={cn(
              "resize-y rounded-xl border border-dashed bg-canvas p-3.5 font-mono text-[12.5px] leading-relaxed text-fg placeholder:text-subtle focus:outline-none",
              drag ? "border-accent-soft" : "border-line-focus focus:border-accent-soft",
            )}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12.5px] text-subtle">Ou arraste um arquivo .yaml para a área acima</span>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="primary" size="lg" onClick={() => render(text)} disabled={!text.trim()}>
                Abrir diagrama
              </Button>
            </div>
          </div>
        </div>

        <section aria-labelledby="exemplos" className="flex flex-col gap-3">
          <h2 id="exemplos" className="text-[13px] font-semibold text-fg-2">
            Ou abra um exemplo
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.title}
                type="button"
                onClick={() => render(ex.yaml)}
                className="group flex cursor-pointer flex-col gap-2 rounded-[14px] border border-[#222A39] bg-raised p-4 text-left transition hover:border-line-focus hover:bg-hover"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent-bg text-accent-ink">
                    <ex.icon size={16} />
                  </span>
                  <ArrowRight size={15} className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[.04em] text-subtle">{ex.kind}</span>
                <b className="text-[14px] text-fg">{ex.title}</b>
                <span className="text-[12.5px] leading-relaxed text-muted">{ex.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="text-center text-[12.5px] text-subtle">Tudo fica no seu navegador. O link carrega o plano inteiro, sem servidor.</p>
      </div>
    </main>
  );
}
