"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Props = { contactCopy: string; markerCopy: string; label: string; className?: string };

/** The long trial, data and terms copy, kept out of the way in an accessible pop-up. */
export default function TrialDetails({ contactCopy, markerCopy, label, className }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const focusables = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [open, close]);

  return (
    <>
      <button ref={triggerRef} type="button" className={className ?? "lxt-link"} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <div className="lxt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div ref={dialogRef} className="lxt-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="lxt-dialog-head">
              <h2 id={titleId}>About your free trial</h2>
              <button type="button" className="lxt-x" aria-label="Close" onClick={close} data-autofocus>×</button>
            </div>
            <div className="lxt-dialog-body">
              <h3>What you get</h3>
              <p>60 days free on the Firm plan: 3 lawyer seats and 20 documents a month, no card needed.</p>
              <h3>How it works</h3>
              <p>We&apos;ll email you a link to confirm your address, and the trial starts when you open it. The link expires in 24 hours. At the end you can choose to subscribe; we never move you to a paid plan automatically. If you don&apos;t subscribe, Lex is switched off and your Lex data is deleted 30 days later.</p>
              <h3>Who can sign up</h3>
              <p>One free trial per firm. Please use your firm email address, not Gmail or similar. Lex is a drafting and research tool, not legal advice.</p>
              <h3>Your details</h3>
              <p>{contactCopy}</p>
              <p>{markerCopy}</p>
              <h3>Terms</h3>
              <p>
                Starting a trial means you agree to the <a href="/terms#lex" target="_blank" rel="noopener">Lex Terms</a>, including the free trial clause, and the{" "}
                <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.
              </p>
            </div>
            <div className="lxt-dialog-foot">
              <button type="button" className="lxt-btn" onClick={close}>Got it</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
