"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SunderConfirmed, SunderConfirming, SunderError, SunderRetry, SunderUnsubscribed } from "./SunderPages";

export type ConfirmState = "working" | "sending" | "retry" | "confirmed" | "already" | "unsubscribed" | "bad";

/** Auto-confirm gate: the page must be visible for MIN_VISIBLE_MS, then either a trusted user
 * interaction or DWELL_MS of continuous visible time opens it. Hidden time resets the clock. */
export const MIN_VISIBLE_MS = 1500;
export const DWELL_MS = 3000;
const SIGNALS = ["pointerdown", "touchstart", "keydown", "scroll", "focus", "wheel"] as const;

/**
 * Confirm from the email link with no second tap for real people.
 * Some security scanners (Defender Safe Links, Proofpoint, Mimecast and others) DO render pages and run JS,
 * so we never POST on mount. The POST waits for the gate above, which most sandbox detonations
 * (hidden or short-lived tabs, no trusted input) never pass. It is a mitigation, not a guarantee.
 * The button is always shown as the explicit path; the POST runs at most once per page.
 */
export default function ConfirmNow({ token, initial = "working" }: { token: string; initial?: ConfirmState }) {
  const [state, setState] = useState<ConfirmState>(initial);
  const sent = useRef(false);

  const go = useCallback(async (manual = false) => {
    if (sent.current && !manual) return;
    sent.current = true;
    setState("sending");
    try {
      const res = await fetch("/api/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token }),
      });
      const data = await res.json().catch(() => ({}));
      const status = data.status;
      if (status === "confirmed" || status === "already" || status === "unsubscribed") setState(status);
      else if (res.status >= 500) setState("retry");
      else setState("bad");
    } catch {
      setState("retry");
    }
  }, [token]);

  useEffect(() => {
    if (initial !== "working") return;
    let visibleSince = document.visibilityState === "visible" ? performance.now() : -1;
    let interacted = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      if (sent.current || visibleSince < 0 || document.visibilityState !== "visible") return;
      const shown = performance.now() - visibleSince;
      if (shown >= MIN_VISIBLE_MS && (interacted || shown >= DWELL_MS)) { void go(); return; }
      timer = setTimeout(check, (interacted ? MIN_VISIBLE_MS : DWELL_MS) - shown + 20);
    };
    const onVis = () => {
      visibleSince = document.visibilityState === "visible" ? performance.now() : -1;
      check();
    };
    const onSignal = (e: Event) => { if (e.isTrusted) { interacted = true; check(); } };
    document.addEventListener("visibilitychange", onVis);
    for (const ev of SIGNALS) window.addEventListener(ev, onSignal, { passive: true, capture: true });
    check();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      for (const ev of SIGNALS) window.removeEventListener(ev, onSignal, { capture: true });
    };
  }, [go, initial]);

  return <ConfirmView state={state} token={token} onConfirm={() => void go(true)} />;
}

const SAY: Record<ConfirmState, string> = {
  working: "Confirming your email.",
  sending: "Confirming your email.",
  retry: "That first try didn't go through. Try again.",
  confirmed: "Confirmed. You're an insider now.",
  already: "Confirmed. You're an insider now.",
  unsubscribed: "You're off the list.",
  bad: "This link has expired.",
};

/** The live region sits outside the swapped view so the announcement survives the state change. */
export function ConfirmView({ state, token = "", onConfirm }: { state: ConfirmState; token?: string; onConfirm?: () => void }) {
  return (
    <>
      <div className="sc-sr" role="status" aria-live="polite">{SAY[state]}</div>
      <StateView state={state} token={token} onConfirm={onConfirm} />
    </>
  );
}

function StateView({ state, token, onConfirm }: { state: ConfirmState; token: string; onConfirm?: () => void }) {
  if (state === "confirmed" || state === "already") return <SunderConfirmed />;
  if (state === "unsubscribed") return <SunderUnsubscribed />;
  if (state === "bad") return <SunderError />;
  // A real form, so the button also works with JS off: the route answers a form POST with a 303 back here.
  const button = (
    <form method="post" action="/api/email/confirm" onSubmit={(e) => { e.preventDefault(); onConfirm?.(); }}>
      <input type="hidden" name="t" value={token} />
      <button type="submit" className="btn" disabled={state === "sending"}>Confirm my email</button>
    </form>
  );
  if (state === "retry") return <SunderRetry action={button} />;
  return <SunderConfirming action={button} />;
}
