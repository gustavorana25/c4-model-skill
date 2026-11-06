import { Code2, MessageCircle } from "lucide-react";
import { copyYaml } from "../hooks";
import { useStore } from "../store";
import { ListeningBadge } from "./ListeningBadge";
import { Button, Logo } from "./ui";

export function TopBar() {
  const doc = useStore((s) => s.doc);
  const commenting = useStore((s) => s.commenting);
  const setCommenting = useStore((s) => s.setCommenting);

  return (
    <header className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-4 border-b border-line bg-panel px-5 py-2">
      <Logo />
      {doc && (
        <>
          <span className="h-6 w-px bg-[#232B3A]" />
          <h1 className="min-w-0 truncate text-[15px] font-semibold text-fg">{doc.plan}</h1>
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
    </header>
  );
}
