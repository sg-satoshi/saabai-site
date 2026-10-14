"use client";
import { useState } from "react";
import { CONSENT_LABELS } from "@/lib/growth/growth2-consent";

export default function TestimonialForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0);
  const [quote, setQuote] = useState("");
  const [consent, setConsent] = useState("name");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const [review, setReview] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setErr("Pick a rating first.");
    setState("busy"); setErr("");
    const r = await fetch("/api/testimonial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, rating, quote, consent }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) { setErr(d?.error || "That didn't send. Try again."); setState("idle"); return; }
    setReview(d.googleReview); setState("done");
  }
  if (state === "done") return (
    <>
      <p><b>Thank you.</b> That means a lot.</p>
      {review && <><p>If you&apos;ve got 30 seconds more, a Google review helps other owners find us.</p><a className="gp-btn acc" href={review} target="_blank" rel="noopener noreferrer">Leave a Google review</a></>}
    </>
  );
  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend>Your rating</legend>
        <div className="gp-stars" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} className={n <= rating ? "on" : ""} onClick={() => setRating(n)}>★</button>)}
        </div>
      </fieldset>
      <label htmlFor="q" style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 8 }}>What changed for your business? (optional)</label>
      <textarea id="q" value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={800} />
      <fieldset>
        <legend>Can we share it?</legend>
        {Object.entries(CONSENT_LABELS).map(([k, v]) => (
          <label className="gp-opt" key={k}><input type="radio" name="consent" value={k} checked={consent === k} onChange={() => setConsent(k)} />{v}</label>
        ))}
      </fieldset>
      {err && <p className="gp-err">{err}</p>}
      <button className="gp-btn" type="submit" disabled={state === "busy"}>{state === "busy" ? "Sending..." : "Send feedback"}</button>
      <p className="gp-small" style={{ marginTop: 12 }}>We record your choice and the date. You can change it any time by replying to Shane.</p>
    </form>
  );
}
