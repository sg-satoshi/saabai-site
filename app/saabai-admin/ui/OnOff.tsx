"use client";
import { useEffect, useId, useRef, useState } from "react";

export type OnOffConfirm = { title: string; body: string; confirmLabel?: string; reasonField?: boolean };

/**
 * ON/OFF status pill (design Option A). The whole pill is the one-click button.
 * Green dot and ON, or red dot and OFF, so it is never colour-only.
 * Turning OFF opens a small confirm popover when `confirmOff` is given. Turning ON is instant,
 * unless `confirmOn` is given (used for the announcements site switch, which publishes live bars).
 * `onToggle` receives the optional reason typed in the popover.
 */
export default function OnOff({ on, label, onToggle, disabled, disabledReason, busy, note, testId, confirmOff, confirmOn, align = "right" }: {
  on: boolean; label: string; onToggle: (reason?: string) => void; disabled?: boolean; disabledReason?: string; busy?: boolean; note?: string; testId?: string;
  confirmOff?: OnOffConfirm; confirmOn?: OnOffConfirm; align?: "right" | "left";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const wrap = useRef<HTMLSpanElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const id = useId();
  const confirm = on ? confirmOff : confirmOn;

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const away = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) close(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(true); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close(refocus: boolean) { setOpen(false); setReason(""); if (refocus) pill.current?.focus(); }
  function click() { if (confirm) setOpen((v) => !v); else onToggle(); }

  const dis = !!disabled || !!busy;
  return (
    <span className="onoff-wrap" ref={wrap}>
      {note && <small className="onoff-note" data-testid={testId ? `${testId}-note` : undefined}>{note}</small>}
      <button ref={pill} type="button" role="switch" aria-checked={on} aria-label={label} aria-busy={busy || undefined} aria-disabled={dis || undefined}
        aria-haspopup={confirm ? "dialog" : undefined} aria-expanded={confirm ? open : undefined}
        title={disabled ? disabledReason : undefined} data-testid={testId} disabled={dis} onClick={click}
        className={`onoff ${on ? "on" : "off"}${busy ? " busy" : ""}`}>
        <i aria-hidden="true" />
        {busy ? "Saving" : on ? "ON" : "OFF"}
      </button>
      {open && confirm && (
        <div role="dialog" aria-label={confirm.title} className={`onoff-pop${align === "left" ? " left" : ""}`} data-testid={testId ? `${testId}-confirm` : undefined}>
          <h6>{confirm.title}</h6>
          <p>{confirm.body}</p>
          {confirm.reasonField && <input aria-label="Reason (optional)" placeholder="Reason (optional)" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} data-testid={testId ? `${testId}-reason` : undefined} />}
          <div className="bt">
            <button type="button" ref={cancel} onClick={() => close(true)} data-testid={testId ? `${testId}-cancel` : undefined}>Cancel</button>
            <button type="button" className={on ? "danger" : undefined} data-testid={testId ? `${testId}-ok` : undefined} onClick={() => { const r = reason.trim(); close(true); onToggle(r || undefined); }}>{confirm.confirmLabel ?? (on ? "Turn off" : "Turn on")}</button>
          </div>
        </div>
      )}
      <span className="sr-only" aria-live="polite" id={id}>{busy ? "Saving" : ""}</span>
    </span>
  );
}
