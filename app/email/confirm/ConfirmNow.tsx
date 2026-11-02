"use client";

import { useState } from "react";

export default function ConfirmNow({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "confirmed" | "already" | "unsubscribed" | "bad">("idle");

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

  if (state === "confirmed") return <p><b>You're confirmed.</b> We'll email you about the SUNDER launch. You can unsubscribe from any of those emails.</p>;
  if (state === "already") return <p><b>Already confirmed.</b> You're on the list.</p>;
  if (state === "unsubscribed") return <p>This address is unsubscribed, so we won't send marketing to it.</p>;
  if (state === "bad") return <p>That didn't confirm. Open the link in the email again.</p>;

  return (
    <button type="button" onClick={go} disabled={state === "working"} style={{ background: "#111", color: "#fff", border: 0, borderRadius: 8, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>
      {state === "working" ? "Confirming…" : "Confirm my email"}
    </button>
  );
}
