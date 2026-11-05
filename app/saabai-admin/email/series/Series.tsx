"use client";

import { useEffect, useState } from "react";
import { documentHtml, textToBlocks } from "../../../../lib/email/blocks";
import { SUNDER_FROM_NAME, SUNDER_IDENTITY } from "../../../../lib/email/constants";
import { renderMarketingEmail } from "../../../../lib/email/message";
import type { EmailAdminSnapshot, SeriesStepView } from "../../../../lib/email/types";

export default function Series() {
  const [snap, setSnap] = useState<EmailAdminSnapshot | null>(null);
  const [steps, setSteps] = useState<SeriesStepView[]>([]);
  const [on, setOn] = useState(false);
  const [saved, setSaved] = useState("");
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<SeriesStepView | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [baseline, setBaseline] = useState("");

  function apply(j: EmailAdminSnapshot) {
    setSnap(j);
    setSteps(j.series.steps);
    setOn(j.series.status === "active");
    setBaseline(JSON.stringify({ steps: j.series.steps, on: j.series.status === "active" }));
  }
  useEffect(() => {
    fetch("/api/admin/email", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (j.ok) apply(j); else setBanner(j.error || "Could not load the series."); }).catch(() => setBanner("Could not load the series."));
  }, []);

  const dirty = JSON.stringify({ steps, on }) !== baseline;
  const invalid = steps.find((s) => !s.subject.trim() || !s.body.trim());

  async function save() {
    if (on && invalid) { setBanner(`Email ${invalid.position + 1} needs a subject and a message before the series can be on.`); return; }
    setBusy(true);
    const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "series", steps, status: on ? "active" : "paused" }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!json.ok) { setBanner(json.error || "Nothing was saved."); return; }
    setSaved("Saved.");
    setBanner("");
    setBaseline(JSON.stringify({ steps, on }));
  }

  function turn(next: boolean) {
    if (next && invalid) { setBanner(`Email ${invalid.position + 1} has no subject. Fix it before you turn the series on.`); return; }
    setOn(next);
    setBanner("");
  }

  return (
    <div className="em-page">
      <div className="ph">
        <div>
          <h1>Welcome series {on ? <span className="badge b-ok">On</span> : <span className="badge b-n">Off</span>}</h1>
          <p className="sub">Trigger: joins the SUNDER waitlist and confirms. Pending people are not enrolled. Exits on unsubscribe. Quiet hours 9pm to 7am Brisbane. These emails are also listed on Campaigns.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={() => turn(!on)}>{on ? "Turn off" : "Turn on"}</button>
          <button type="button" className="btn pri" disabled={!dirty || busy} onClick={save}>{busy ? "Saving" : "Save changes"}</button>
        </div>
      </div>
      {saved && !dirty && <p className="em-help">{saved}</p>}
      {banner && <div className="em-alert bad" role="alert" style={{ marginBottom: 12 }}>{banner}</div>}
      {!on && <div className="em-alert info" style={{ marginBottom: 12 }}>Series is off. New people are not enrolled. People mid-series stop at their next step.</div>}
      <div className="em-split">
        <div style={{ display: "grid", gap: 12 }}>
          {steps.map((step, i) => {
            const prev = i === 0 ? 0 : steps[i - 1].delayDays;
            const wait = i === 0 ? "Sent right after confirm" : `Wait ${step.delayDays - prev} days (day ${step.delayDays})`;
            return (
              <div key={step.position} className="em-tl">
                <div className="em-dot">D{step.delayDays}</div>
                <div className="card" style={{ flex: 1 }}>
                  <div className="hd">
                    <div>
                      <div className="em-help">{wait} <button type="button" className="btn sm" onClick={() => setEditing(step.position)}>Change delay</button></div>
                      <h2>Email {i + 1}, day {step.delayDays}</h2>
                      <div>{step.subject || "No subject yet"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className={`badge ${step.subject && step.body ? "b-ok" : "b-n"}`}>{step.subject && step.body ? "Active" : "Draft"}</span>
                      <button type="button" className="btn sm" onClick={() => setPreview(step)}>Preview</button>
                      <button type="button" className="btn sm pri" onClick={() => setEditing(step.position)}>Edit</button>
                    </div>
                  </div>
                  {editing === step.position && (
                    <div className="bd" style={{ display: "grid", gap: 8 }}>
                      <label className="em-field">Days after they confirm<input type="number" min={0} max={365} value={step.delayDays} onChange={(e) => setSteps((list) => list.map((s) => s.position === step.position ? { ...s, delayDays: Number(e.target.value) } : s))} /></label>
                      <label className="em-field">Subject<input value={step.subject} maxLength={200} onChange={(e) => setSteps((list) => list.map((s) => s.position === step.position ? { ...s, subject: e.target.value } : s))} /></label>
                      <label className="em-field">Message<textarea rows={5} value={step.body} onChange={(e) => setSteps((list) => list.map((s) => s.position === step.position ? { ...s, body: e.target.value } : s))} /></label>
                    </div>
                  )}
                  <div className="bd em-help">Quiet hours 9pm to 7am are respected. Opens are indicative and are not measured yet.</div>
                </div>
              </div>
            );
          })}
          <div className="em-add">Add step (later phase: wait, email, condition)</div>
        </div>
        <div className="card"><div className="hd"><h2>Series status</h2></div>
          <div className="bd">
            <div className="em-kv">
              <span>Enrolled</span><b className="num">{snap?.series.enrolled ?? 0}</b>
              <span>In progress</span><b className="num">{snap?.series.active ?? 0}</b>
              <span>Completed</span><b className="num">{snap?.series.completed ?? 0}</b>
              <span>Exited</span><b className="num">{snap?.series.exited ?? 0}</b>
            </div>
            {!dirty && <p className="em-help">Nothing changed yet.</p>}
          </div>
        </div>
      </div>
      {preview && (
        <div className="em-modal">
          <div className="em-dialog" role="dialog" aria-modal="true" aria-labelledby="prev-h" style={{ width: "min(680px, 100%)" }}>
            <h2 id="prev-h">{preview.subject}</h2>
            <iframe title="Series preview" sandbox="" style={{ width: "100%", height: 480, border: 0 }} srcDoc={renderMarketingEmail({
              subject: preview.subject,
              html: documentHtml({ preheader: "", blocks: textToBlocks(preview.body) }),
              fromName: SUNDER_FROM_NAME,
              identity: SUNDER_IDENTITY,
              unsubUrl: "https://saabai.ai/email/u",
              values: { firstName: "Sam" },
            }).html} />
            <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => setPreview(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
