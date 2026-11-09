import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./index.css";
import App from "./App";
import { installBridge } from "./bridge";
import { EMBED } from "./embed";

// window.blueroll, para o agente que abre o viewer no navegador embutido; no iframe não há conversa
if (!EMBED) installBridge();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
