"use client";
import { useRef, useState } from "react";
import { LEX_TRIAL_CONTACT_COPY, LEX_TRIAL_MARKER_COPY } from "@/lib/lex-trial-copy";
import TrialDetails from "./TrialDetails";

export default function TrialForm({ code }: { code: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bad = (name: string) => (field === name ? { "aria-invalid": true as const, "aria-describedby": "trial-error" } : {});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null); setField(null);
    try {
      const res = await fetch("/api/lex/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: f.get("code"), name: f.get("name"), email: f.get("email"), firmName: f.get("firmName"),
          phone: f.get("phone"), street: f.get("street"), suburb: f.get("suburb"), state: f.get("state"), postcode: f.get("postcode"), abn: f.get("abn"), website: f.get("website"),
          acceptTerms: f.get("acceptTerms") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) { setDone(true); return; }
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

  if (done) {
    return (
      <div role="status">
        <p className="lede"><strong>Check your inbox.</strong> We&apos;ve sent a link to confirm your email. Your free trial starts when you open it. The link expires in 24 hours.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      {code ? <input type="hidden" name="code" value={code} /> : null}
      <label htmlFor="firmName">Firm name</label>
      <input id="firmName" name="firmName" {...bad("firmName")} type="text" autoComplete="organization" required maxLength={160} />
      <label htmlFor="name">Your name</label>
      <input id="name" name="name" {...bad("name")} type="text" autoComplete="name" required maxLength={120} />
      <label htmlFor="email">Work email <small>(your firm address, not Gmail or similar)</small></label>
      <input id="email" name="email" {...bad("email")} type="email" autoComplete="email" required maxLength={200} />
      <label htmlFor="phone">Phone</label>
      <input id="phone" name="phone" {...bad("phone")} type="tel" autoComplete="tel" required maxLength={40} placeholder="07 3000 0000" />
      <fieldset>
        <legend>Firm address</legend>
        <label htmlFor="street">Street address</label>
        <input id="street" name="street" {...bad("street")} type="text" autoComplete="street-address" required maxLength={160} />
        <label htmlFor="suburb">Suburb</label>
        <input id="suburb" name="suburb" {...bad("suburb")} type="text" autoComplete="address-level2" required maxLength={80} />
        <div className="lxt-row">
        <div>
        <label htmlFor="state">State</label>
        <select id="state" name="state" {...bad("state")} required defaultValue="">
          <option value="" disabled>Choose…</option>
          {["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        </div>
        <div>
        <label htmlFor="postcode">Postcode</label>
        <input id="postcode" name="postcode" {...bad("postcode")} type="text" inputMode="numeric" autoComplete="postal-code" required maxLength={4} pattern="[0-9]{4}" />
        </div>
        </div>
      </fieldset>
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
      <p className="note" style={{ textAlign: "left", marginTop: 6 }}>
        <TrialDetails contactCopy={LEX_TRIAL_CONTACT_COPY} markerCopy={LEX_TRIAL_MARKER_COPY} label="Your details, privacy and trial terms" />
      </p>
      {error ? <p id="trial-error" className="err" role="alert">{error}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Start my free trial"}</button>
      <p className="note">No card, and you won&apos;t be charged unless you choose to subscribe.</p>
      <p className="note">Lex is a drafting and research tool, not legal advice.</p>
    </form>
  );
}
