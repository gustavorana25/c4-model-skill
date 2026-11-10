import { ArrowUp, AtSign, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { comment } from "../../bridge";
import { typeMeta } from "../../lib/notation";
import { useT } from "../../i18n";
import { useStore } from "../../store";
import { ElementIcon } from "../ElementIcon";
import { cn, floating } from "../ui";

/** "@palavra" logo antes do cursor, para sugerir elementos. */
function mentionAt(text: string, caret: number) {
  const m = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
  return m ? { start: caret - m[2].length - 1, query: m[2].toLowerCase() } : null;
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Composer do modo comentário (tecla C). Os cards clicados no canvas ou citados com @ viram os alvos.
 * O comentário vai para o chat; a resposta também fica lá. A página não guarda a conversa.
 */
export function CommentComposer() {
  const commenting = useStore((s) => s.commenting);
  const targets = useStore((s) => s.commentTargets);
  const model = useStore((s) => s.model)!;
  const listening = useStore((s) => s.listening);
  const everListened = useStore((s) => s.everListened);
  const setCommenting = useStore((s) => s.setCommenting);
  const toggle = useStore((s) => s.toggleCommentTarget);
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [hi, setHi] = useState(0);
  const [busy, setBusy] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const t = useT();

  useEffect(() => {
    if (commenting) ta.current?.focus();
  }, [commenting, targets.length]);

  const mention = mentionAt(text, caret);
  const options = useMemo(() => {
    if (!mention) return [];
    const q = norm(mention.query);
    return [...model.index.values()]
      .filter((e) => !targets.includes(e.id) && (norm(e.name).includes(q) || e.id.includes(q)))
      .slice(0, 6);
  }, [mention?.query, model, targets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setHi(0), [mention?.query]);

  if (!commenting) return null;

  const pick = (id: string) => {
    if (!mention) return;
    toggle(id);
    // o "@web" vira o nome do card no texto, e o card entra nos alvos
    const name = `${model.index.get(id)?.name ?? id} `;
    const pos = mention.start + name.length;
    setText(text.slice(0, mention.start) + name + text.slice(caret));
    setCaret(pos);
    requestAnimationFrame(() => ta.current?.setSelectionRange(pos, pos));
  };

  const submit = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    const r = await comment(targets, v);
    setBusy(false);
    if (r === "sent") useStore.getState().notify(t("comment.sent"));
    setText("");
    setCommenting(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (options.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setHi((h) => (h + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(options[hi].id);
        return;
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setCommenting(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "Backspace" && !text && targets.length) {
      toggle(targets.at(-1)!);
    }
  };

  const insertAt = () => {
    const el = ta.current;
    const pos = el?.selectionStart ?? text.length;
    const pre = text.slice(0, pos);
    const add = pre && !/\s$/.test(pre) ? " @" : "@";
    setText(pre + add + text.slice(pos));
    setCaret(pos + add.length);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + add.length, pos + add.length);
    });
  };

  return (
    <div className="absolute bottom-16 left-1/2 z-20 w-[min(560px,calc(100%-32px))] -translate-x-1/2" role="dialog" aria-label={t("comment.dialog")}>
      {options.length > 0 && (
        <ul role="listbox" className={cn(floating, "mb-2 overflow-hidden p-1")}>
          {options.map((o, i) => (
            <li key={o.id} role="option" aria-selected={i === hi}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.id)}
                onMouseEnter={() => setHi(i)}
                className={cn("flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]", i === hi ? "bg-hover text-fg" : "text-fg-2")}
              >
                <ElementIcon el={o} size={13} className="shrink-0" style={{ color: typeMeta(model.notation, o.type).ink }} />
                <span className="truncate font-medium">{o.name}</span>
                <span className="ml-auto truncate text-[11.5px] text-subtle">{typeMeta(model.notation, o.type).label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="overflow-hidden rounded-2xl border border-accent bg-raised shadow-[0_16px_40px_rgba(0,0,0,.55)]">
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3">
          <MessageCircle size={14} className="text-accent-ink" />
          {targets.map((id) => {
            const el = model.index.get(id);
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-accent-bg py-0.5 pl-2 pr-1 text-[12px] font-medium text-accent-ink">
                {el?.name ?? id}
                <button type="button" onClick={() => toggle(id)} className="flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-white/10" aria-label={t("comment.remove", el?.name ?? id)}>
                  <X size={11} />
                </button>
              </span>
            );
          })}
          <span className="text-[12px] text-subtle">
            {targets.length ? t("comment.hintMore") : t("comment.hintFirst")}
          </span>
        </div>
        <label htmlFor="comment-text" className="sr-only">
          {t("comment.label")}
        </label>
        <textarea
          id="comment-text"
          ref={ta}
          rows={2}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCaret(e.target.selectionStart);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyDown={onKey}
          placeholder={t("comment.placeholder")}
          className="block w-full resize-none bg-transparent px-4 py-2.5 text-[14.5px] text-fg placeholder:text-subtle focus:outline-none"
        />
        <div className="flex items-center gap-2 border-t border-line px-3 py-2">
          <button type="button" onClick={insertAt} className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg" aria-label={t("comment.mention")}>
            <AtSign size={16} />
          </button>
          <span className="min-w-0 flex-1 truncate text-[12px] text-subtle">
            {listening ? t("comment.footerOn") : everListened ? t("comment.footerResume") : t("comment.footerOff")}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || busy}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-accent text-white transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
            aria-label={listening ? t("comment.send") : t("comment.copy")}
          >
            <ArrowUp size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
