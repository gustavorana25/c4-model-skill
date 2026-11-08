import { Code2, MessageCircle } from "lucide-react";
import { copyYaml } from "../hooks";
import { titleOf } from "../lib/model";
import { useStore } from "../store";
import { ListeningBadge } from "./ListeningBadge";
import { Button, cn, Logo } from "./ui";

const REPO_URL = "https://github.com/gustavorana25/c4-model-skill";

function GitHubLink({ className }: { className?: string }) {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      title="Código no GitHub"
      aria-label="Código no GitHub"
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
        title="Início"
        aria-label="Blueroll, voltar ao início"
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
              Diagrama {notation.label}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-3.5">
            <ListeningBadge />
            <Button variant="outline" onClick={copyYaml} title="Copiar o documento em YAML">
              <Code2 size={16} /> YAML
            </Button>
            <Button variant="primary" onClick={() => setCommenting(!commenting)} aria-pressed={commenting} title="Perguntar ou pedir mudança sobre um ou mais cards (C)">
              <MessageCircle size={16} /> Comentar
            </Button>
          </div>
        </>
      )}
      <GitHubLink className={doc ? "-ml-1.5" : "ml-auto"} />
    </header>
  );
}
