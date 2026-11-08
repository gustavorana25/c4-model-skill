// Idioma da interface. Sem dependências do resto do app: o store principal e a lib leem daqui.
// O conteúdo do diagrama (nomes, descrições) é de quem escreveu o documento e não passa por aqui.
import { create } from "zustand";
import { en } from "./en";
import { es } from "./es";
import { ptBR } from "./pt-BR";

export type Dict = typeof ptBR;
export type Key = keyof Dict;
export type Lang = "pt-BR" | "en" | "es";

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "pt-BR", label: "Português", short: "PT" },
  { id: "es", label: "Español", short: "ES" },
];

const DICTS: Record<Lang, Dict> = { "pt-BR": ptBR, en, es };
const STORAGE_KEY = "blueroll.lang";

/** "pt", "pt-PT", "pt-BR" → pt-BR; "es-*" → es; o resto → en. */
export function normalizeLang(tag: string | null | undefined): Lang | null {
  if (!tag) return null;
  const t = tag.toLowerCase();
  if (t.startsWith("pt")) return "pt-BR";
  if (t.startsWith("es")) return "es";
  if (t.startsWith("en")) return "en";
  return null;
}

function initialLang(): Lang {
  try {
    const saved = normalizeLang(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {
    /* sem localStorage (teste, modo privado) */
  }
  if (typeof navigator !== "undefined")
    for (const l of navigator.languages ?? [navigator.language]) {
      const n = normalizeLang(l);
      if (n) return n;
    }
  return "en";
}

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignora */
    }
    set({ lang });
  },
}));

type Args<K extends Key> = Dict[K] extends (...a: infer A) => string ? A : [];

export function translate<K extends Key>(lang: Lang, key: K, ...args: Args<K>): string {
  const v = DICTS[lang][key] as string | ((...a: unknown[]) => string);
  return typeof v === "function" ? v(...args) : v;
}

/** Fora do React (lib, store, bridge): usa o idioma atual. */
export const t = <K extends Key>(key: K, ...args: Args<K>) => translate(useLang.getState().lang, key, ...args);

/** Nos componentes: re-renderiza quando o idioma muda. */
export function useT() {
  const lang = useLang((s) => s.lang);
  return <K extends Key>(key: K, ...args: Args<K>) => translate(lang, key, ...args);
}
