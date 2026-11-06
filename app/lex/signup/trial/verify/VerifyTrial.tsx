"use client";
import { useState } from "react";

export default function VerifyTrial({ token }: { token: string }) {
  const [state, setState] = useState<"ready" | "busy" | "done">("ready");
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setState("busy"); setError(null);
    const r = await fetch("/api/lex/trial/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && d.ok) { setState("done"); return; }
    setError(d.error || "Something went wrong. Please try again."); setState("ready");
  }
  if (state === "done") {
    return (
      <div role="status">
        <p className="lede"><strong>Your free trial has started.</strong> Check your inbox for a link to set your password (or sign in with your existing Saabai login), then open Lex. You can add 2 colleagues from Firm Settings.</p>
        <a className="btn" href="/lex">Open Lex</a>
      </div>
    );
  }
  return (
    <>
      <p className="lede">Thanks for confirming your email. Press the button to start your firm&apos;s 60-day free trial. No card, and you won&apos;t be charged unless you choose to subscribe.</p>
      {error ? <p className="err" role="alert">{error}</p> : null}
      <button className="btn" type="button" disabled={!token || state === "busy"} onClick={go}>{state === "busy" ? "Starting your trial…" : "Start my free trial"}</button>
    </>
  );
}
