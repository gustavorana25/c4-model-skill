import type { TypeMark as Mark } from "../../lib/notation";

/**
 * Desenho do tipo no canto de cima do card, inteiro e apagado (marca d'água): cilindro para banco,
 * mensagens em fila para fila. Fica atrás do texto e não ocupa espaço do card.
 * Desenho escolhido em canvas de design ("F · 2 + 3", versão pequena).
 */
export function TypeMark({ kind, color }: { kind: Mark; color: string }) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 -z-10 opacity-20" style={{ color }} aria-hidden="true">
      {kind === "cylinder" ? (
        <svg width="28" height="34" viewBox="0 0 28 34" fill="none" stroke="currentColor" strokeWidth="2" className="block">
          <ellipse cx="14" cy="6" rx="12" ry="4.5" />
          <path d="M2 6v22c0 2.5 5.4 4.5 12 4.5s12-2 12-4.5V6" />
          <path d="M2 17c0 2.5 5.4 4.5 12 4.5s12-2 12-4.5" />
        </svg>
      ) : (
        <svg width="38" height="31" viewBox="0 0 32 26" fill="none" stroke="currentColor" strokeWidth="2" className="block">
          <rect x="1" y="5" width="8" height="16" rx="2.5" />
          <rect x="12" y="5" width="8" height="16" rx="2.5" />
          <path d="M23 13h7M27 9l3 4-3 4" />
        </svg>
      )}
    </div>
  );
}
