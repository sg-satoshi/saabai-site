"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { previewAutomated, type AutomatedEditor, type AutomatedSource } from "../../../../lib/email/automated";
import { sunderToken } from "../../../../lib/email/merge-tags";

type Load = AutomatedEditor | { ok: false; error?: string } | null;

export default function AutoEditor({ emailKey }: { emailKey: string }) {
  const [data, setData] = useState<Load>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [baseline, setBaseline] = useState("");
  const [banner, setBanner] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  function apply(j: AutomatedEditor) {
    setData(j);
    setSubject(j.subject);
    setMessage(j.message);
    setButtonLabel(j.buttonLabel || "");
    setBaseline(JSON.stringify({ subject: j.subject, message: j.message, buttonLabel: j.buttonLabel || "" }));
  }

  useEffect(() => {
    fetch(`/api/admin/email?view=automated&key=${encodeURIComponent(emailKey)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok) apply(j); else setData(j); })
      .catch(() => setData({ ok: false, error: "Could not load this email." }));
  }, [emailKey]);

  const editor = data && data.ok ? data : null;
  const dirty = JSON.stringify({ subject, message, buttonLabel }) !== baseline;
  const preview = useMemo(() => {
    if (!editor) return null;
    return previewAutomated({
      mode: editor.mode,
      subject,
      message,
      buttonLabel,
      storedHtml: editor.storedHtml,
      useStoredHtml: editor.useStoredHtml && !message,
    });
  }, [editor, subject, message, buttonLabel]);

  async function save() {
    if (!editor || editor.source === "missing") return;
    setBusy(true);
    setBanner("");
    const res = await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "automated", key: editor.key, subject, message, buttonLabel }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!json.ok) { setBanner(json.error || "Nothing was saved."); return; }
    setSaved("Saved. The next send uses this message. Nothing was sent.");
    setBaseline(JSON.stringify({ subject, message, buttonLabel }));
    setData({ ...editor, source: "saved", useStoredHtml: false });
  }

  if (!data) return <div className="em-page"><div className="em-skel" /></div>;
  if (!data.ok) {
    return (
      <div className="em-page">
        <div className="em-alert bad" role="alert">{data.error || "Could not load this email."}</div>
        <p style={{ marginTop: 16 }}><Link href="/saabai-admin/email" className="btn">Back to campaigns</Link></p>
      </div>
    );
  }

  const source = sourceText(data.source);
  return (
    <div className="em-page">
      <div className="ph">
        <div>
          <h1>{data.name} <span className="badge b-sched">Automated</span></h1>
          <p className="sub">{data.trigger}. {data.timing}. {source}</p>
        </div>
        <button type="button" className="btn pri" disabled={!dirty || busy || data.source === "missing"} onClick={save}>{busy ? "Saving" : "Save changes"}</button>
      </div>
      {saved && !dirty && <p className="em-help">{saved}</p>}
      {banner && <div className="em-alert bad" role="alert" style={{ marginBottom: 12 }}>{banner}</div>}
      {data.source === "missing" && <div className="em-alert info" style={{ marginBottom: 12 }}>This welcome email is not in the database yet, so there is nothing to edit. The series is created by migration 009.</div>}
      {data.useStoredHtml && !message && <div className="em-alert info" style={{ marginBottom: 12 }}>The text box is empty. The preview is the stored HTML that goes out today. Type a message and save to switch the next send to that text. Until you save, nothing changes.</div>}
      <div className="em-split">
        <div className="card">
          <div className="hd"><h2>Message</h2></div>
          <div className="bd" style={{ display: "grid", gap: 8 }}>
            <label className="em-field">Subject
              <input value={subject} maxLength={200} disabled={data.source === "missing"} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="em-field">Message
              <textarea rows={12} value={message} disabled={data.source === "missing"} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <button type="button" className="btn sm" disabled={data.source === "missing"} onClick={() => setMessage((m) => `${m}${m && !m.endsWith(" ") && !m.endsWith("\n") ? " " : ""}${sunderToken("firstName")}`)}>Insert first name</button>
            {data.buttonLabel !== null && (
              <label className="em-field">Button label
                <input value={buttonLabel} maxLength={80} onChange={(e) => setButtonLabel(e.target.value)} />
                <span className="em-help">{data.mode === "confirm" ? "The button always opens a one-time confirm link." : "The button always opens that person's referral link."}</span>
              </label>
            )}
            <p className="em-help">{data.lockNote}</p>
          </div>
        </div>
        <div className="card">
          <div className="hd"><h2>Preview</h2><span className="em-help">Sample name Sam. Same layout the sender uses.</span></div>
          <div className="bd">
            <iframe title="Automated email preview" sandbox="" style={{ width: "100%", height: 520, border: 0, background: "#fff" }} srcDoc={preview?.html || ""} />
          </div>
        </div>
      </div>
      <p style={{ marginTop: 16 }}><Link href="/saabai-admin/email" className="btn">Back to campaigns</Link></p>
    </div>
  );
}

function sourceText(source: AutomatedSource) {
  if (source === "saved") return "Using the saved message.";
  if (source === "built-in") return "Using the built-in message until you save an edit.";
  return "Not in the database.";
}
