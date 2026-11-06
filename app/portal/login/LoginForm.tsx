"use client";
import { useState } from "react";

export default function LoginForm({ notice }: { notice: "setting-up" | "legacy" | "expired" | null }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Please enter a valid email address."); return; }
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/portal/blueprint/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      if (!r.ok) throw new Error();
      setSent(true);
    } catch {
      setErr("Something went wrong. Please try again, or email hello@saabai.ai.");
    } finally { setBusy(false); }
  }

  return (
    <div className="bp-login">
      <section className="bp-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/saabai-lockup-dark.png" alt="Saabai.ai" style={{ height: 56, width: "auto", alignSelf: "flex-start" }} />
        <h2>Your Blueprint starts here.</h2>
        <p>This is your private space to share what we need so we can build your Blueprint. It takes about 15 minutes, and you can stop and come back any time.</p>
        <ul>
          <li><b>1</b>Tell us about your business</li>
          <li><b>2</b>Review everything in one place</li>
          <li><b>3</b>Submit it to us for build</li>
        </ul>
      </section>
      <section className="bp-lform">
        <div className="bp-card">
          {sent ? (
            <div role="status">
              <span className="bp-eyebrow">Check your inbox</span>
              <h1 style={{ fontSize: 28, marginTop: 8 }}>Link on its way</h1>
              <p className="lead">If we have an order under <b>{email.trim()}</b>, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>Nothing yet? Check spam, or use the email address you ordered with.</p>
              <div className="bp-foot-actions">
                <button className="bp-btn ghost" onClick={() => setSent(false)}>Use a different email</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <span className="bp-eyebrow">Client portal</span>
              <h1 style={{ fontSize: 28, marginTop: 8 }}>Sign in with your email</h1>
              {notice === "setting-up" && <div className="bp-banner info" role="status">Thanks for your order. We are still setting up your portal. Enter your email and we will send you a link.</div>}
              {notice === "legacy" && <div className="bp-banner info" role="status">Your fact-find now lives in your portal. Enter your email and we will send you a link.</div>}
              {notice === "expired" && <div className="bp-banner warn" role="alert">That link has expired or was already used. Enter your email for a fresh one.</div>}
              <p className="lead">No password needed. We will email you a one-tap link.</p>
              <label htmlFor="email" style={{ fontWeight: 600 }}>Email address</label>
              <input id="email" className="bp-in" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(err)} aria-describedby={err ? "e-err" : undefined} style={{ margin: "6px 0 14px" }} />
              {err && <p id="e-err" role="alert" style={{ color: "var(--err-fg)", margin: "0 0 12px" }}>{err}</p>}
              <button className="bp-btn" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Sending..." : "Email me a sign-in link"}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
