import { Check, ChevronDown, Code2, Languages, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyYaml } from "../hooks";
import { LANGS, useLang, useT } from "../i18n";
import { titleOf } from "../lib/model";
import { useStore } from "../store";
import { ListeningBadge } from "./ListeningBadge";
import { Button, cn, floating, Logo } from "./ui";

const REPO_URL = "https://github.com/gustavorana25/c4-model-skill";

function GitHubLink({ className }: { className?: string }) {
  const t = useT();
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      title={t("top.github")}
      aria-label={t("top.github")}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-hover hover:text-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" width={18} height={18} fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    </a>
  );
}

export function TopBar() {
  const doc = useStore((s) => s.doc);
  const notation = useStore((s) => s.model?.notation);
  const commenting = useStore((s) => s.commenting);
  const setCommenting = useStore((s) => s.setCommenting);
  const t = useT();

  return (
    <header className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-4 border-b border-line bg-panel px-5 py-2">
      <a
        href={location.pathname + location.search}
        onClick={(e) => {
          // volta para a tela inicial sem recarregar; o voltar do navegador reabre o diagrama
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          if (!useStore.getState().doc) return;
          history.pushState(null, "", location.pathname + location.search);
          useStore.getState().clear();
        }}
        title={t("top.home")}
        aria-label={t("top.homeAria")}
        className="-m-1 rounded-lg p-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft"
      >
        <Logo />
      </a>
      {doc && (
        <>
          <span className="h-6 w-px bg-[#232B3A]" />
          <h1 className="min-w-0 truncate text-[15px] font-semibold text-fg">{titleOf(doc)}</h1>
          {notation && (
            <span
              className="-ml-1.5 shrink-0 rounded-md bg-[#161D2A] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[.04em] text-muted"
              title={notation.description}
            >
              {t("top.notation", notation.label)}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-3.5">
            <ListeningBadge />
            <Button variant="outline" onClick={copyYaml} title={t("top.yamlTitle")}>
              <Code2 size={16} /> YAML
            </Button>
            <Button variant="primary" onClick={() => setCommenting(!commenting)} aria-pressed={commenting} title={t("top.commentTitle")}>
              <MessageCircle size={16} /> {t("top.comment")}
            </Button>
          </div>
        </>
      )}
      <LangSelect className={doc ? "-ml-1.5" : "ml-auto"} />
      <GitHubLink className="-ml-1.5" />
    </header>
  );
}

/** Idioma da interface. O conteúdo do diagrama fica como foi escrito. */
function LangSelect({ className }: { className?: string }) {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);
  useEffect(() => {
    if (open) items.current[hi]?.focus();
  }, [open, hi]);

  const show = () => {
    setHi(Math.max(0, LANGS.findIndex((l) => l.id === lang)));
    setOpen(true);
  };
  const pick = (id: typeof lang) => {
    setLang(id);
    setOpen(false);
    button.current?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => (h + (e.key === "ArrowDown" ? 1 : LANGS.length - 1)) % LANGS.length);
    } else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={root} className={cn("relative", className)} onKeyDown={open ? onKey : undefined}>
      <button
        ref={button}
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => !open && (e.key === "ArrowDown" || e.key === "ArrowUp") && (e.preventDefault(), show())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("top.language")}: ${LANGS.find((l) => l.id === lang)?.label}`}
        title={t("top.language")}
        className={cn(
          "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] px-2.5 text-[12.5px] font-semibold transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
          open ? "bg-hover text-fg" : "text-muted hover:bg-hover hover:text-fg",
        )}
      >
        <Languages size={16} aria-hidden="true" />
        {LANGS.find((l) => l.id === lang)?.short}
        <ChevronDown size={13} aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" aria-label={t("top.language")} className={cn(floating, "absolute right-0 top-[calc(100%+6px)] z-50 flex w-44 flex-col p-1")}>
          {LANGS.map((l, i) => (
            <button
              key={l.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={l.id === lang}
              tabIndex={i === hi ? 0 : -1}
              onClick={() => pick(l.id)}
              onMouseEnter={() => setHi(i)}
              className={cn(
                "flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] outline-none transition-colors",
                i === hi ? "bg-hover text-fg" : "text-fg-2",
              )}
            >
              <span className="w-6 text-[11px] font-semibold text-subtle">{l.short}</span>
              <span className="flex-1">{l.label}</span>
              {l.id === lang && <Check size={14} className="text-accent-ink" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
