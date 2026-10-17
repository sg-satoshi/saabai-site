"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AnswerBlocks from "../../_c/AnswerBlocks";
import type { Q, Value } from "../../_c/QuestionField";

interface Snap {
  id: string; sections: { id: string; title: string }[]; questions: (Q & { section: string })[];
  answers: Record<string, Value>;
  progress: { percent: number; answered: number; totalQuestions: number; missingRequired: number; blanks: { id: string; label: string; required: boolean }[] };
}

export default function ReviewClient({ snap }: { snap: Snap }) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const p = snap.progress;
  const optionalBlank = p.blanks.length - p.missingRequired;

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/portal/blueprint/${snap.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent }) });
      if (r.ok) { router.push(`/portal/${snap.id}/submitted`); return; }
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "Something went wrong. Please try again.");
    } catch {
      setErr("We could not reach the server. Please check your connection and try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <h1>Review and submit</h1>
      <p className="lead">Check your answers, edit anything, then send it to us for build. You can come back and finish later if you are not ready.</p>
      {p.missingRequired > 0 ? (
        <div className="bp-banner warn" role="status">
          <b>{p.missingRequired} required question{p.missingRequired === 1 ? " is" : "s are"} still blank.</b> You cannot submit until {p.missingRequired === 1 ? "it is" : "they are"} answered. A short &ldquo;not sure yet&rdquo; is fine. Use the Edit buttons below.
        </div>
      ) : optionalBlank > 0 ? (
        <div className="bp-banner info" role="status">All required questions are answered. {optionalBlank} optional question{optionalBlank === 1 ? " is" : "s are"} blank. You can submit as is, or fill them in first for a sharper Blueprint.</div>
      ) : (
        <div className="bp-banner info" role="status">Everything is answered. Nice work.</div>
      )}
      <AnswerBlocks id={snap.id} sections={snap.sections} questions={snap.questions} answers={snap.answers} editable />
      <section className="bp-card" aria-label="Submit for build">
        <h2>Ready to send it to us?</h2>
        <p className="lead" style={{ marginBottom: 14 }}>Submitting locks your answers so our team builds from one stable version. If you need a change afterwards, reply to our email and we will reopen it for you.</p>
        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", minHeight: 44 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 24, height: 24, marginTop: 2, accentColor: "#2454c8" }} />
          <span>I have checked my answers and I am happy for Saabai to use them to build my Blueprint.</span>
        </label>
        {err && <p role="alert" style={{ color: "var(--err-fg)", margin: "14px 0 0" }}>{err}</p>}
        <div className="bp-foot-actions">
          <Link className="bp-btn ghost" href={`/portal/${snap.id}/factfind`}>Back to the fact-find</Link>
          <button className="bp-btn" onClick={submit} disabled={!consent || busy || p.missingRequired > 0}>{busy ? "Submitting..." : "Submit for build"}</button>
        </div>
      </section>
    </>
  );
}
