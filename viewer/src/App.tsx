import { ReactFlowProvider } from "@xyflow/react";
import { useEffect } from "react";
import { Canvas } from "./components/canvas/Canvas";
import { EmptyState } from "./components/EmptyState";
import { Sidebar } from "./components/sidebar/Sidebar";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import { useHashSync, useKeyboard } from "./hooks";
import { titleOf } from "./lib/model";
import { EMBED } from "./embed";
import { useLang, useT } from "./i18n";
import { useStore } from "./store";

export default function App() {
  useHashSync();
  useKeyboard();
  const doc = useStore((s) => s.doc);
  const lang = useLang((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.title = doc ? `${titleOf(doc)} · Blueroll` : "Blueroll";
  }, [doc]);

  if (EMBED) return <EmbedApp />;

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      {doc ? (
        <main className="flex min-h-0 flex-1">
          <ReactFlowProvider>
            <div className="min-w-0 flex-1">
              <Canvas />
            </div>
          </ReactFlowProvider>
          <Sidebar />
        </main>
      ) : (
        <EmptyState />
      )}
      <Toast />
    </div>
  );
}

/** Modo iframe: só o diagrama. Sem documento, uma linha com o erro do link (ou nada). */
function EmbedApp() {
  const doc = useStore((s) => s.doc);
  const loadError = useStore((s) => s.loadError);
  const t = useT();
  return (
    <div className="embed h-full">
      {doc ? (
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-muted">
          {loadError ?? t("embed.empty")}
        </div>
      )}
    </div>
  );
}
