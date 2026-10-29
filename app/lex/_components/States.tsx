"use client";

import { OCR_NOTE } from "../../../lib/lex-upload-client";
import { LEX_DOC_ACCEPT } from "../../../lib/lex-doc-accept";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ALL_SCOPES, LEX_SCOPES, isFullScope, scopeLabel, type LexScopeKey } from "../../../lib/lex-scope";
import type { LexStep } from "../../../lib/lex-steps";
import { type LexError, signInHref } from "../../../lib/lex-errors";
import { Icon } from "./icons";

/** Tax and ATO dispute samples for the empty state (Tributum Law is a tax firm). */
export const SAMPLE_QUESTIONS: { tag: string; q: string }[] = [
  { tag: "ATO dispute", q: "What are the time limits for lodging an objection to an amended assessment?" },
  { tag: "Division 7A", q: "When will a journal entry count as a minimum yearly repayment under Division 7A?" },
  { tag: "Penalties", q: "What grounds support remission of a shortfall penalty?" },
  { tag: "ART review", q: "How do I apply to the ART for review of an objection decision, and what are the time limits?" },
];

export const FOLLOW_UPS = [
  "What are the leading cases on this?",
  "What does the ATO say in its rulings?",
  "What should I check before advising the client?",
];

export type Attachment = { name: string; text: string; words: number; privacy?: string; ocr?: boolean };

type ComposerProps = {
  value: string; onChange: (v: string) => void; onSend: () => void; disabled?: boolean;
  placeholder: string; contextLabel?: string; autoFocus?: boolean;
  scope?: LexScopeKey[]; onScope?: (s: LexScopeKey[]) => void;
  attachment?: Attachment | null; attaching?: boolean; attachError?: string | null;
  onAttach?: (f: File) => void; onClearAttachment?: () => void;
};

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onSend, disabled, placeholder, contextLabel, autoFocus, scope = ALL_SCOPES, onScope, attachment, attaching, attachError, onAttach, onClearAttachment }, ref,
) {
  const [scopeOpen, setScopeOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = typeof ref === "object" ? ref?.current : null;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value, ref]);
  useEffect(() => {
    if (!scopeOpen) return;
    const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setScopeOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setScopeOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [scopeOpen]);
  const toggle = (k: LexScopeKey) => {
    const next = scope.includes(k) ? scope.filter((x) => x !== k) : [...scope, k];
    if (next.length) onScope?.(ALL_SCOPES.filter((x) => next.includes(x)));
  };
  return (
    <div className="lx-cbox">
      {attachment && (
        <div className="lx-attached">
          <Icon name="attach" size={14} /><b>{attachment.name}</b><span>{attachment.words.toLocaleString("en-AU")} words, sent with your next question{attachment.ocr ? `. ${OCR_NOTE}` : ""}{attachment.privacy ? `. ${attachment.privacy}` : ""}</span>
          <button type="button" aria-label="Remove attachment" onClick={onClearAttachment}><Icon name="close" size={14} /></button>
        </div>
      )}
      {attachError && <div className="lx-attached bad">{attachError}</div>}
      <textarea ref={ref} value={value} rows={1} placeholder={placeholder} aria-label="Research question" autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
      <div className="row">
        {contextLabel && <span className="lx-chip on" title="This research is saved in this thread">{contextLabel}</span>}
        <div className="lx-scope" ref={wrapRef}>
          <button type="button" className={`lx-chip btn${isFullScope(scope) ? "" : " on"}`} aria-haspopup="menu" aria-expanded={scopeOpen} onClick={() => setScopeOpen((o) => !o)}>
            {scopeLabel(scope)}<span className="car" aria-hidden="true">&#9662;</span>
          </button>
          {scopeOpen && (
            <div className="lx-scope-menu" role="menu" aria-label="Sources Lex may search">
              <p>Search these sources</p>
              {LEX_SCOPES.map((s) => (
                <label key={s.key} className="opt">
                  <input type="checkbox" checked={scope.includes(s.key)} onChange={() => toggle(s.key)} />
                  <span><b>{s.label}</b><small>{s.hint}</small></span>
                </label>
              ))}
              <button type="button" className="all" onClick={() => onScope?.(ALL_SCOPES)}>Search all sources</button>
            </div>
          )}
        </div>
        <button type="button" className="lx-chip btn" onClick={() => fileRef.current?.click()} disabled={attaching} title="Attach a PDF, Word or text file as context">
          <Icon name="attach" size={13} />{attaching ? "Reading file..." : "Attach"}
        </button>
        <input ref={fileRef} type="file" hidden accept={LEX_DOC_ACCEPT}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach?.(f); e.target.value = ""; }} />
        <button type="button" className="lx-send" onClick={onSend} disabled={disabled || attaching || !value.trim()} aria-label="Send">
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
});

export function EmptyState({ firmName, onPick, composer }: { firmName?: string; onPick: (q: string) => void; composer: React.ReactNode }) {
  return (
    <div className="lx-hero">
      <div>
        <h1>What are we researching today?</h1>
        <p>Lex searches Australian case law, legislation and ATO material, and cites every claim with a pinpoint.</p>
        {composer}
        <div className="lx-samples">
          {SAMPLE_QUESTIONS.map((s) => (
            <button key={s.q} type="button" onClick={() => onPick(s.q)}>
              <span className="lx-pill sm t-acc">{s.tag}</span>
              <span className="q">{s.q}</span>
            </button>
          ))}
        </div>
        <div className="lx-trust">
          <span>&#10003; Australian sources</span>
          <span>&#10003; Pinpoints checked against the source text</span>
          <span>&#10003; Unverified items flagged</span>
        </div>
        <div className="note">{firmName ? `${firmName} workspace. ` : ""}Lex output is research assistance, not legal advice.</div>
      </div>
    </div>
  );
}

/** Live step list built from the tools the research stream reports, with each search's outcome. */
export function SearchingSteps({ steps, label }: { steps: LexStep[]; label: string }) {
  const failed = steps.filter((s) => s.status === "failed").length;
  return (
    <div className="lx-steps" role="status" aria-live="polite">
      <h4>Researching</h4>
      <ul>
        {steps.length === 0 && <li className="now"><span className="b" />{label}</li>}
        {steps.map((s) => (
          <li key={s.id} className={s.status === "running" ? "now" : s.status}>
            <span className="b">{s.status === "done" && <Icon name="check" size={10} />}{s.status === "failed" && "!"}{s.status === "empty" && "0"}</span>
            {stepLabel(s.tool)}
            {s.status === "done" && s.count != null && <em>{s.count} found</em>}
            {s.status === "empty" && <em>no results</em>}
            {s.status === "failed" && <em>{s.tool === "readSource" ? "could not read" : "source unavailable"}</em>}
          </li>
        ))}
      </ul>
      <div className="fine">
        {failed > 0 ? `${failed} ${failed === 1 ? "source was" : "sources were"} unavailable. Lex carries on with the rest and flags anything it could not check.` : "Lex reads the sources it cites, so a full answer can take up to a minute."}
      </div>
    </div>
  );
}

/** Shown when every search came back empty or failed and the answer cites nothing. */
export function NoResultsCard({ narrowed, onWiden, onRephrase }: { narrowed: boolean; onWiden: () => void; onRephrase: () => void }) {
  return (
    <div className="lx-err info" role="note" data-lex-empty>
      <b>No sources found for this question</b>
      <p>Lex searched {narrowed ? "the sources you picked" : "case law, legislation and ATO material"} and found nothing it could cite, so treat the answer above as a starting point only.</p>
      <ul>
        {narrowed && <li>Search all sources instead of a narrowed scope.</li>}
        <li>Use the legal term or section number, for example &quot;s 109D ITAA 1936&quot;.</li>
        <li>Name the jurisdiction or tribunal if it matters.</li>
      </ul>
      <div className="row">
        {narrowed && <button type="button" className="lx-btn primary" onClick={onWiden}>Search all sources</button>}
        <button type="button" className="lx-btn" onClick={onRephrase}>Rephrase question</button>
      </div>
    </div>
  );
}

export function ErrorCard({ error, onRetry, retryLabel = "Try again" }: { error: LexError; onRetry?: () => void; retryLabel?: string }) {
  const showActions = error.signIn || error.contactHref || (error.canRetry && onRetry);
  return (
    <div className="lx-err" role="alert" data-lex-error={error.kind}>
      <b>{error.title}</b>
      <p>{error.message}</p>
      {showActions && (
        <div className="row">
          {error.signIn && (
            <a className="lx-btn primary" href={signInHref(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/lex")}>Sign in</a>
          )}
          {error.contactHref && (
            <a className="lx-btn primary" href={error.contactHref}>Contact Saabai</a>
          )}
          {error.canRetry && onRetry && (
            <button type="button" className="lx-btn primary" onClick={onRetry} data-no-feedback>{retryLabel}</button>
          )}
        </div>
      )}
    </div>
  );
}

/** Label for a research tool call shown in the step list (null for tools the user doesn't need to see). */
export function stepLabel(tool: string): string | null {
  const labels: Record<string, string> = {
    checkCitation: "Checking the licensed case-law snapshot",
    searchAustLII: "AustLII search (not the licensed snapshot)",
    searchATO: "Searching ATO rulings and guidance",
    searchLegislation: "Searching federal legislation",
    checkLegislationStatus: "Checking Act status",
    searchStateLegislation: "Searching state legislation",
    verifySection: "Checking the section in the Act",
    readSource: "Reading a source to check pinpoints",
    searchInternational: "Searching international databases",
    searchASIC: "Searching ASIC guidance",
    searchART: "Searching ART and former AAT decisions",
    searchFairWork: "Searching the Fair Work Commission",
    searchCorporationsLaw: "Searching corporations law",
    searchFamilyLaw: "Family Court is outside the licensed snapshot",
  };
  if (tool === "captureMatter") return null;
  return labels[tool] ?? "Searching";
}
