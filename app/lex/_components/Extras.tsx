"use client";

import { useEffect, useRef, useState } from "react";
import { searchThreads, matchSnippet } from "../../../lib/lex-steps";
import { FLAG_REASONS, type FlagReason } from "../../../lib/lex-flag";
import type { Thread } from "./types";
import { Icon } from "./icons";

/** Ctrl K palette: start new research or jump to a thread by title or content. */
export function CommandPalette({ threads, onNew, onOpen, onClose }: {
  threads: Thread[]; onNew: () => void; onOpen: (id: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const hits = searchThreads(threads, q);
  const total = hits.length + 1;
  const pick = (i: number) => { if (i === 0) onNew(); else onOpen(hits[i - 1].id); onClose(); };
  return (
    <div className="lx-modal-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lx-palette" role="dialog" aria-label="Search research">
        <div className="in">
          <Icon name="search" size={16} />
          <input ref={inputRef} value={q} placeholder="Search your research, or start new" aria-label="Search research"
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => (s + 1) % total); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (s - 1 + total) % total); }
              else if (e.key === "Enter") { e.preventDefault(); pick(sel); }
            }} />
          <kbd>Esc</kbd>
        </div>
        <ul role="listbox">
          <li role="option" aria-selected={sel === 0} className={sel === 0 ? "on" : ""} onMouseEnter={() => setSel(0)} onClick={() => pick(0)}>
            <Icon name="plus" size={15} /><div><b>New research</b>{q.trim() && <small>Start fresh, then ask: {q.trim()}</small>}</div>
          </li>
          {hits.length > 0 && <li className="hd" aria-hidden="true">{q.trim() ? "Matching threads" : "Recent threads"}</li>}
          {hits.map((t, i) => (
            <li key={t.id} role="option" aria-selected={sel === i + 1} className={sel === i + 1 ? "on" : ""} onMouseEnter={() => setSel(i + 1)} onClick={() => pick(i + 1)}>
              <Icon name="research" size={15} />
              <div><b>{t.title}</b><small>{matchSnippet(t, q)}</small></div>
            </li>
          ))}
          {q.trim() && hits.length === 0 && <li className="none" aria-hidden="true">No threads match &quot;{q.trim()}&quot;</li>}
        </ul>
      </div>
    </div>
  );
}

/** Flag an issue with an answer. Goes to the Saabai team, not the client. */
export function FlagDialog({ onSubmit, onClose }: { onSubmit: (reason: FlagReason, note: string) => Promise<boolean>; onClose: () => void }) {
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  return (
    <div className="lx-modal-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="lx-dialog" role="dialog" aria-label="Flag an issue">
        <h3>Flag an issue with this answer</h3>
        <p className="sub">This goes to the Saabai team to review. It is not sent to anyone else.</p>
        <div className="reasons">
          {FLAG_REASONS.map((r) => (
            <label key={r.key} className={reason === r.key ? "on" : ""}>
              <input type="radio" name="lx-flag" checked={reason === r.key} onChange={() => setReason(r.key)} />{r.label}
            </label>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} placeholder="What is wrong? For example, the case was overturned, or the pinpoint is off. (optional)" aria-label="Details" />
        {state === "error" && <div className="bad">Could not send the flag. Try again.</div>}
        <div className="row">
          <button type="button" className="lx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="lx-btn primary" disabled={!reason || state === "sending"}
            onClick={async () => { if (!reason) return; setState("sending"); const ok = await onSubmit(reason, note); if (ok) onClose(); else setState("error"); }}>
            {state === "sending" ? "Sending..." : "Send flag"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Share menu for the whole research thread. No public link: copy or email from the lawyer's own mail app. */
export function ShareMenu({ onCopy, emailHref, copied, onClose }: { onCopy: () => void; emailHref: string; copied: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [onClose]);
  return (
    <div className="lx-menu lx-share" role="menu" ref={ref}>
      <button type="button" role="menuitem" onClick={onCopy}><Icon name="copy" size={14} />{copied ? "Copied research thread" : "Copy research thread"}<small>All questions and answers, with citations</small></button>
      <a role="menuitem" href={emailHref} onClick={onClose}><Icon name="share" size={14} />Email research thread<small>Opens your mail app. Nothing is sent until you send it.</small></a>
      <hr />
      <p className="fine">Shared research stays private to your firm. There is no public link.</p>
    </div>
  );
}
