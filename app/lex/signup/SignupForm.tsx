"use client";
import { useRef, useState } from "react";

export default function SignupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bad = (name: string) => (field === name ? { "aria-invalid": true as const, "aria-describedby": "signup-error" } : {});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null); setField(null);
    try {
      const res = await fetch("/api/lex/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"), email: f.get("email"), firmName: f.get("firmName"),
          phone: f.get("phone"), abn: f.get("abn"), website: f.get("website"),
          acceptTerms: f.get("acceptTerms") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setError(data.error || "Something went wrong. Please try again.");
      if (typeof data.field === "string") {
        setField(data.field);
        const el = formRef.current?.elements.namedItem(data.field);
        if (el instanceof HTMLElement) el.focus();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <label htmlFor="name">Full name</label>
      <input id="name" name="name" {...bad("name")} type="text" autoComplete="name" required maxLength={120} />
      <label htmlFor="email">Work email</label>
      <input id="email" name="email" {...bad("email")} type="email" autoComplete="email" required maxLength={200} />
      <label htmlFor="firmName">Firm name</label>
      <input id="firmName" name="firmName" {...bad("firmName")} type="text" autoComplete="organization" required maxLength={160} />
      <label htmlFor="phone">Phone <small>(optional)</small></label>
      <input id="phone" name="phone" {...bad("phone")} type="tel" autoComplete="tel" maxLength={40} />
      <label htmlFor="abn">ABN <small>(optional)</small></label>
      <input id="abn" name="abn" {...bad("abn")} type="text" inputMode="numeric" maxLength={20} />
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="check">
        <input type="checkbox" name="acceptTerms" required {...bad("acceptTerms")} />
        <span>I agree to the <a href="/terms#lex" target="_blank" rel="noopener">Lex Terms</a> and the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span>
      </label>
      {error ? <p id="signup-error" className="err" role="alert">{error}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Starting checkout…" : "Continue to payment"}</button>
      <p className="note">You&apos;ll pay securely with Stripe. Your Lex login is created once payment clears, and you can invite 2 colleagues from Firm Settings. Lex is a drafting and research tool, not legal advice.</p>
    </form>
  );
}
