"use client";
import { useState } from "react";

export const NEUTRAL = "If you're on the list, we've emailed your link.";

export default function CheckForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await fetch("/api/sunder-waitlist/referral-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(f.get("email") || ""), website: String(f.get("website") || "") }),
      });
    } catch { /* same neutral answer either way */ }
    setBusy(false);
    setDone(true);
  }
  if (done) return <p role="status" className="ref-ok">{NEUTRAL} Check your inbox (and spam) in a minute.</p>;
  return (
    <form className="ref-form" onSubmit={submit}>
      <label htmlFor="ref-email" className="sc-sr">Email</label>
      <input id="ref-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" maxLength={254} />
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
      <button className="btn" type="submit" disabled={busy}>{busy ? "Sending..." : "Email my link"}</button>
      <small>Only the owner of the email gets the link. Nobody else can see your referrals.</small>
    </form>
  );
}
