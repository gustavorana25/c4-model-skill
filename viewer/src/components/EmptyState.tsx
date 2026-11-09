import { load } from "js-yaml";
import { AlertTriangle, ArrowRight, BookOpen, ClipboardCheck, Cloud, Route, Shapes, ShieldCheck, type LucideIcon } from "lucide-react";
import { useState } from "react";
import twoFaPt from "../../../skills/blueroll/examples/2fa.arch.yaml?raw";
import twoFaEn from "../../../skills/blueroll/examples/2fa.en.arch.yaml?raw";
import twoFaEs from "../../../skills/blueroll/examples/2fa.es.arch.yaml?raw";
import awsPt from "../../../skills/blueroll/examples/aws.arch.yaml?raw";
import awsEn from "../../../skills/blueroll/examples/aws.en.arch.yaml?raw";
import awsEs from "../../../skills/blueroll/examples/aws.es.arch.yaml?raw";
import jornadaPt from "../../../skills/blueroll/examples/jornada.arch.yaml?raw";
import jornadaEn from "../../../skills/blueroll/examples/jornada.en.arch.yaml?raw";
import jornadaEs from "../../../skills/blueroll/examples/jornada.es.arch.yaml?raw";
import { useLang, useT, type Key, type Lang } from "../i18n";
import { useStore } from "../store";
import { Button, cn } from "./ui";

/** Os três usos da skill; as chaves de texto seguem empty.step{n}. */
const USES = [
  { n: 1, icon: ClipboardCheck },
  { n: 2, icon: BookOpen },
  { n: 3, icon: Shapes },
] as const;

/** Cada exemplo em pt-BR, en e es (mesmos ids): o card abre o do idioma da interface. */
const EXAMPLES: { id: "2fa" | "aws" | "jornada"; icon: LucideIcon; yaml: Record<Lang, string> }[] = [
  { id: "2fa", icon: ShieldCheck, yaml: { "pt-BR": twoFaPt, en: twoFaEn, es: twoFaEs } },
  { id: "aws", icon: Cloud, yaml: { "pt-BR": awsPt, en: awsEn, es: awsEs } },
  { id: "jornada", icon: Route, yaml: { "pt-BR": jornadaPt, en: jornadaEn, es: jornadaEs } },
];

export function EmptyState() {
  const loadDoc = useStore((s) => s.load);
  const loadError = useStore((s) => s.loadError);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const t = useT();
  const lang = useLang((s) => s.lang);

  const render = (src: string) => {
    try {
      loadDoc(load(src));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <main className="flex flex-1 overflow-auto bg-canvas bg-[radial-gradient(#1A2130_1px,transparent_1px)] [background-size:22px_22px] px-5 py-12">
      {/* m-auto em vez de items-center/justify-center: quando o conteúdo é mais alto que a tela, o topo não é cortado */}
      <div className="m-auto flex w-full max-w-[720px] flex-col gap-7">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-fg">
            {t("empty.title1")}
            <br />
            {t("empty.title2")}
          </h1>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-muted">
            {t("empty.lead")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {USES.map(({ n, icon: Icon }) => (
            <div key={n} className="flex flex-col gap-2 rounded-[14px] border border-[#222A39] bg-raised p-4">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-bg text-accent-ink"><Icon size={16} /></span>
              <b className="text-[14px] text-fg">{t(`empty.step${n}.t`)}</b>
              <span className="text-[13px] leading-relaxed text-muted">{t(`empty.step${n}.d`)}</span>
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
            {t("empty.yamlLabel")}
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
            placeholder={t("empty.placeholder")}
            className={cn(
              "resize-y rounded-xl border border-dashed bg-canvas p-3.5 font-mono text-[12.5px] leading-relaxed text-fg placeholder:text-subtle focus:outline-none",
              drag ? "border-accent-soft" : "border-line-focus focus:border-accent-soft",
            )}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12.5px] text-subtle">{t("empty.drop")}</span>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="primary" size="lg" onClick={() => render(text)} disabled={!text.trim()}>
                {t("empty.open")}
              </Button>
            </div>
          </div>
        </div>

        <section aria-labelledby="exemplos" className="flex flex-col gap-3">
          <h2 id="exemplos" className="text-[13px] font-semibold text-fg-2">
            {t("empty.examples")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => render(ex.yaml[lang])}
                className="group flex cursor-pointer flex-col gap-2 rounded-[14px] border border-[#222A39] bg-raised p-4 text-left transition hover:border-line-focus hover:bg-hover"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent-bg text-accent-ink">
                    <ex.icon size={16} />
                  </span>
                  <ArrowRight size={15} className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[.04em] text-subtle">{t(`empty.ex.${ex.id}.k` as Key)}</span>
                <b className="text-[14px] text-fg">{t(`empty.ex.${ex.id}.t` as Key)}</b>
                <span className="text-[12.5px] leading-relaxed text-muted">{t(`empty.ex.${ex.id}.d` as Key)}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="text-center text-[12.5px] text-subtle">{t("empty.privacy")}</p>
      </div>
    </main>
  );
}
