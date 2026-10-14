"use client";
import { useState } from "react";

export default function UnsubscribeForm({ e, t }: { e: string; t: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function go() {
    setState("busy");
    const r = await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ e, t }) }).catch(() => null);
    setState(r?.ok ? "done" : "error");
  }
  if (state === "done") return <p><b>Done.</b> You&apos;re unsubscribed. Sorry to see you go.</p>;
  return (
    <>
      {state === "error" && <p className="gp-err">That didn&apos;t work. The link may be old. Reply to any of our emails and we&apos;ll remove you.</p>}
      <button className="gp-btn" onClick={go} disabled={state === "busy"}>{state === "busy" ? "Unsubscribing..." : "Unsubscribe"}</button>
    </>
  );
}
