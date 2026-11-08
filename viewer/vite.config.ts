/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// O build gera um único dist/index.html autocontido (JS + CSS inline):
// funciona em qualquer host estático e também aberto direto do disco (file://).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: {
    port: 5173,
    // No Windows, duas gravações seguidas no mesmo arquivo às vezes chegam como uma só e o
    // Vite fica com a primeira versão. Esperar o arquivo estabilizar evita servir código velho.
    watch: { awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 25 } },
    fs: { allow: [".."] }, // permite importar ../skills/c4-plan/examples
  },
  test: {
    environment: "node",
  },
});
