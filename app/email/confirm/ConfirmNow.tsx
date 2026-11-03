"use client";

import { useState } from "react";
import { SunderConfirmed, SunderError, SunderPending, SunderUnsubscribed } from "./SunderPages";

export type ConfirmState = "idle" | "working" | "confirmed" | "already" | "unsubscribed" | "bad";

/** Two-step confirm (link scanners only GET). The POST runs only when the person taps the button. */
export default function ConfirmNow({ token, initial = "idle" }: { token: string; initial?: ConfirmState }) {
  const [state, setState] = useState<ConfirmState>(initial);

  async function go() {
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
      else setState("bad");
    } catch {
      setState("bad");
    }
  }

  return <ConfirmView state={state} onConfirm={go} />;
}

export function ConfirmView({ state, onConfirm }: { state: ConfirmState; onConfirm?: () => void }) {
  if (state === "confirmed" || state === "already") return <SunderConfirmed />;
  if (state === "unsubscribed") return <SunderUnsubscribed />;
  if (state === "bad") return <SunderError />;
  return (
    <SunderPending action={
      <button type="button" className="btn" onClick={onConfirm} disabled={state === "working"}>
        {state === "working" ? "Confirming…" : "Confirm my email"}
      </button>
    } />
  );
}
