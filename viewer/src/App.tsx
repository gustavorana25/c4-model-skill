import { ReactFlowProvider } from "@xyflow/react";
import { useEffect } from "react";
import { Canvas } from "./components/canvas/Canvas";
import { EmptyState } from "./components/EmptyState";
import { SendDialog } from "./components/SendDialog";
import { Sidebar } from "./components/sidebar/Sidebar";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import { useHashSync, useKeyboard } from "./hooks";
import { useStore } from "./store";

export default function App() {
  useHashSync();
  useKeyboard();
  const doc = useStore((s) => s.doc);

  useEffect(() => {
    document.title = doc ? `${doc.plan} · C4 Plan` : "C4 Plan";
  }, [doc?.plan]);

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
          <SendDialog />
        </main>
      ) : (
        <EmptyState />
      )}
      <Toast />
    </div>
  );
}
