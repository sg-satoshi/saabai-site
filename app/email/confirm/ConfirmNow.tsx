"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SunderConfirmed, SunderConfirming, SunderError, SunderPending, SunderUnsubscribed } from "./SunderPages";

export type ConfirmState = "working" | "retry" | "confirmed" | "already" | "unsubscribed" | "bad";

/**
 * One-click confirm. Link scanners only GET and don't run JS, so the page itself has no side effects;
 * the POST runs from client JS on mount, once (guarded against strict/double mount).
 * If the request fails (network or server error) the button comes back as a retry fallback.
 */
export default function ConfirmNow({ token, initial = "working" }: { token: string; initial?: ConfirmState }) {
  const [state, setState] = useState<ConfirmState>(initial);
  const sent = useRef(false);

  const go = useCallback(async () => {
    setState("working");
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
    if (sent.current || initial !== "working") return;
    sent.current = true;
    void go();
  }, [go, initial]);

  return <ConfirmView state={state} onConfirm={go} />;
}

export function ConfirmView({ state, onConfirm }: { state: ConfirmState; onConfirm?: () => void }) {
  if (state === "confirmed" || state === "already") return <SunderConfirmed />;
  if (state === "unsubscribed") return <SunderUnsubscribed />;
  if (state === "bad") return <SunderError />;
  if (state === "working") return <SunderConfirming />;
  return (
    <SunderPending action={
      <button type="button" className="btn" onClick={onConfirm}>Confirm my email</button>
    } />
  );
}
