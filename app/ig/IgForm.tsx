"use client";

import { useState } from "react";
import { submitInstagramSiteCheck, type IgSiteCheck } from "@/lib/ig-lead";

const empty = { name: "", business: "", website: "", email: "", phone: "", problem: "" };

export default function IgForm() {
  const [fields, setFields] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [check, setCheck] = useState<IgSiteCheck | null>(null);

  function set(key: keyof typeof empty, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const result = await submitInstagramSiteCheck({ ...fields, search });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(result.saved);
    setCheck(result.check);
    if (!result.saved && result.error) setError(result.error);
  }

  if (check) {
    return (
      <div className="card ig-result" role="status">
        <p className="eyebrow">Your site check</p>
        {check.score !== null ? (
          <p className="ig-score"><b>{check.score}</b><span>out of 100</span></p>
        ) : (
          <h2>{check.read ? "No score from the pages we opened." : "We couldn't read your site."}</h2>
        )}
        <p>{check.summary}</p>
        {check.fixes.length > 0 ? (
          <div className="ig-fixes">
            <h3>First three fixes</h3>
            <ol>
              {check.fixes.map((fix, i) => (
                <li key={`${i}-${fix.what.slice(0, 48)}`}>
                  <strong>{fix.what}</strong>
                  <span>{fix.why}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {check.checked.length > 0 ? <p className="ig-checked">Checked: {check.checked.join(", ")}.</p> : null}
        <a className="btn full" href="/blueprint">See the Blueprint audit</a>
        {error ? <p className="ig-error" role="alert">{error}</p> : null}
        <p className="ig-fine">
          {saved
            ? "We saved your name, email, and this result. We do not email you a copy."
            : "We could not save your details. Email hello@saabai.ai and we will take it from there."}
          {" "}
          <a href="/privacy">Privacy policy</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="ig-form" onSubmit={onSubmit} noValidate>
      <div className="ig-field">
        <label htmlFor="ig-website">Website</label>
        <input id="ig-website" name="website" type="url" inputMode="url" autoComplete="url" placeholder="example.com.au" required value={fields.website} onChange={(e) => set("website", e.target.value)} />
      </div>
      <div className="ig-field">
        <label htmlFor="ig-name">Name</label>
        <input id="ig-name" name="name" autoComplete="name" required value={fields.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="ig-field">
        <label htmlFor="ig-business">Business</label>
        <input id="ig-business" name="business" autoComplete="organization" required value={fields.business} onChange={(e) => set("business", e.target.value)} />
      </div>
      <div className="ig-field">
        <label htmlFor="ig-email">Email</label>
        <input id="ig-email" name="email" type="email" autoComplete="email" inputMode="email" required value={fields.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="ig-field">
        <label htmlFor="ig-phone">Phone <span className="ig-opt">(optional)</span></label>
        <input id="ig-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div className="ig-field">
        <label htmlFor="ig-problem">Biggest problem <span className="ig-opt">(optional)</span></label>
        <textarea id="ig-problem" name="problem" rows={3} maxLength={500} value={fields.problem} onChange={(e) => set("problem", e.target.value)} />
      </div>
      {error ? <p className="ig-error" role="alert">{error}</p> : null}
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? "Checking your site..." : "Check my site"}
      </button>
      <p className="ig-fine">
        We save your name, email, and the check result. We do not email you a copy. See the <a href="/privacy">privacy policy</a>.
      </p>
    </form>
  );
}
