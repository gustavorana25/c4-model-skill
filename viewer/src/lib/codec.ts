import { t as tr } from "../i18n";
// Formato do hash: #v1.<base64url(deflate-raw(json))>[~<id da view>]
// Precisa continuar compatível com skills/blueroll/scripts/arch_url.py.
import type { ArchDoc } from "./types";

export const VERSION = 1;

function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const body = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

export async function encodeDoc(doc: ArchDoc): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(doc));
  return `v${VERSION}.` + bytesToB64url(await pipe(raw, new CompressionStream("deflate-raw")));
}

export function buildHash(payload: string, focus: string | null): string {
  return "#" + payload + (focus ? "~" + encodeURIComponent(focus) : "");
}

export async function decodeHash(input: string): Promise<{ doc: unknown; focus: string | null }> {
  let h = input.includes("#") ? input.slice(input.indexOf("#") + 1) : input;
  let focus: string | null = null;
  const t = h.indexOf("~");
  if (t >= 0) {
    focus = decodeURIComponent(h.slice(t + 1)) || null;
    h = h.slice(0, t);
  }
  const m = /^v(\d+)\.([\s\S]+)$/.exec(h.trim());
  if (!m) throw new Error(tr("err.noPrefix"));
  if (Number(m[1]) !== VERSION) throw new Error(tr("err.version", m[1]));
  const bytes = await pipe(b64urlToBytes(m[2]), new DecompressionStream("deflate-raw"));
  return { doc: JSON.parse(new TextDecoder().decode(bytes)), focus };
}
