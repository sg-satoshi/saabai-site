"use client";

import { forwardRef, useEffect } from "react";
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

type ComposerProps = {
  value: string; onChange: (v: string) => void; onSend: () => void; disabled?: boolean;
  placeholder: string; scopeLabel?: string; contextLabel?: string; autoFocus?: boolean;
};

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onSend, disabled, placeholder, scopeLabel = "Sources: Cases, Legislation, ATO", contextLabel, autoFocus }, ref,
) {
  useEffect(() => {
    const el = typeof ref === "object" ? ref?.current : null;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value, ref]);
  return (
    <div className="lx-cbox">
      <textarea ref={ref} value={value} rows={1} placeholder={placeholder} aria-label="Research question" autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
      <div className="row">
        {contextLabel && <span className="lx-chip on" title="This research is saved in this thread">{contextLabel}</span>}
        <span className="lx-chip" title="Lex searches AustLII, the Federal Register of Legislation and the ATO">{scopeLabel}</span>
        <button type="button" className="lx-send" onClick={onSend} disabled={disabled || !value.trim()} aria-label="Send">
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" />
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

/** Live step list built from the tools the research stream reports. */
export function SearchingSteps({ steps, label }: { steps: string[]; label: string }) {
  const all = steps.length ? steps : [label];
  return (
    <div className="lx-steps" role="status" aria-live="polite">
      <h4>Researching</h4>
      <ul>
        {all.map((s, i) => {
          const done = i < all.length - 1;
          return (
            <li key={`${s}-${i}`} className={done ? "done" : "now"}>
              <span className="b">{done && <Icon name="check" size={10} />}</span>{s}
            </li>
          );
        })}
      </ul>
      <div className="fine">Lex reads the sources it cites, so a full answer can take up to a minute.</div>
    </div>
  );
}

export function ErrorCard({ error, onRetry, retryLabel = "Try again" }: { error: LexError; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div className="lx-err" role="alert" data-lex-error={error.kind}>
      <b>{error.title}</b>
      <p>{error.message}</p>
      {(error.signIn || (error.canRetry && onRetry)) && (
        <div className="row">
          {error.signIn && (
            <a className="lx-btn primary" href={signInHref(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/lex")}>Sign in</a>
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
    searchAustLII: "Searching case law on AustLII",
    searchATO: "Searching ATO rulings and guidance",
    searchLegislation: "Searching federal legislation",
    searchStateLegislation: "Searching state legislation",
    verifySection: "Checking the section in the Act",
    readSource: "Reading a source to check pinpoints",
    searchInternational: "Searching international databases",
    searchASIC: "Searching ASIC guidance",
    searchART: "Searching ART and former AAT decisions",
    searchFairWork: "Searching the Fair Work Commission",
    searchCorporationsLaw: "Searching corporations law",
    searchFamilyLaw: "Searching family law",
  };
  if (tool === "captureMatter") return null;
  return labels[tool] ?? "Searching";
}
