"use client";

import { useState } from "react";
import { submitInstagramLead } from "@/lib/ig-lead";

const empty = { name: "", business: "", website: "", email: "", phone: "", problem: "" };

export default function IgForm() {
  const [fields, setFields] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  function set(key: keyof typeof empty, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const result = await submitInstagramLead({ ...fields, search });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card ig-ok" role="status">
        <h2>You&apos;re in.</h2>
        <p>Shane will watch your site and email you a short video review.</p>
        <p>
          When you want the full plan, the <a href="/blueprint">Blueprint</a> is the paid audit that follows this check.
        </p>
      </div>
    );
  }

  return (
    <form className="ig-form" onSubmit={onSubmit} noValidate>
      <div className="ig-field">
        <label htmlFor="ig-name">Name</label>
        <input id="ig-name" name="name" autoComplete="name" required value={fields.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="ig-field">
        <label htmlFor="ig-business">Business</label>
        <input id="ig-business" name="business" autoComplete="organization" required value={fields.business} onChange={(e) => set("business", e.target.value)} />
      </div>
      <div className="ig-field">
        <label htmlFor="ig-website">Website</label>
        <input id="ig-website" name="website" type="url" inputMode="url" autoComplete="url" placeholder="example.com.au" required value={fields.website} onChange={(e) => set("website", e.target.value)} />
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
        {pending ? "Sending..." : "Get my free site check"}
      </button>
      <p className="ig-fine">
        Shane emails the video to this address. See the <a href="/privacy">privacy policy</a>.
      </p>
    </form>
  );
}
