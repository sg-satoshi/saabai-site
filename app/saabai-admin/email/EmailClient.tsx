"use client";

import { useEffect, useMemo, useState } from "react";
import OnOff from "../ui/OnOff";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { SUNDER_IDENTITY } from "../../../lib/email/constants";
import { buildSunderHtml, renderMarketingEmail } from "../../../lib/email/message";
import type { EmailAdminSnapshot, SeriesStepView } from "../../../lib/email/types";

type Load = EmailAdminSnapshot | { ok: false; migration?: boolean; error: string } | null;

const EMPTY_STEP = (position: number, delayDays: number): SeriesStepView => ({ position, delayDays, subject: "", body: "" });

export default function EmailClient() {
  const [data, setData] = useState<Load>(null);
  const [fromName, setFromName] = useState("SUNDER");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testTo, setTestTo] = useState("success@simulator.amazonses.com");
  const [steps, setSteps] = useState<SeriesStepView[]>([EMPTY_STEP(0, 0), EMPTY_STEP(1, 3), EMPTY_STEP(2, 7)]);
  const [seriesOn, setSeriesOn] = useState(true);
  const [banner, setBanner] = useState<{ kind: "ok" | "bad" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/email", { cache: "no-store" });
    const json = await res.json().catch(() => ({ ok: false, error: "Couldn't load SUNDER email." }));
    setData(json);
    if (json.ok) {
      setFromName(json.fromName || "SUNDER");
      if (json.series?.steps?.length) setSteps(json.series.steps);
      setSeriesOn(json.series?.status !== "paused");
    }
  }

  useEffect(() => { load().catch(() => setData({ ok: false, error: "Couldn't load SUNDER email." })); }, []);

  const preview = useMemo(() => renderMarketingEmail({
    subject: subject || "Subject",
    html: buildSunderHtml(body || "Your message"),
    fromName,
    identity: { ...SUNDER_IDENTITY, fromName: fromName || "SUNDER" },
    unsubUrl: "https://saabai.ai/email/u",
    values: { firstName: "Sam" },
  }), [subject, body, fromName]);

  async function post(payload: Record<string, unknown>, label: string) {
    setBusy(label);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) setBanner({ kind: "bad", text: json.error || "That didn't work." });
      else return json;
    } catch {
      setBanner({ kind: "bad", text: "That didn't work. Check your connection and try again." });
    } finally {
      setBusy("");
    }
    return null;
  }

  async function onPause(paused: boolean) {
    const json = await post({ action: "pause", paused }, "pause");
    if (json) {
      setBanner({ kind: "info", text: paused ? "Sending is paused. Nothing goes out until you turn it back on." : "Sending is on." });
      await load();
    }
  }

  async function onTest() {
    const json = await post({ action: "test", to: testTo, subject, body, fromName }, "test");
    if (json?.ok) setBanner({ kind: "ok", text: `Test sent to ${testTo} as "${json.subject}".` });
  }

  async function onBroadcast() {
    const json = await post({
      action: "broadcast",
      subject,
      body,
      fromName,
      requestKey: `b${crypto.randomUUID().replace(/-/g, "")}`,
    }, "send");
    setConfirming(false);
    if (json?.ok) {
      setBanner({ kind: "ok", text: `Queued ${json.queued}. ${json.suppressed} were on the suppression list. The sender runs every minute.` });
      await load();
    }
  }

  async function onSaveSeries() {
    const json = await post({ action: "series", steps, status: seriesOn ? "active" : "paused" }, "series");
    if (json?.ok) {
      setBanner({ kind: "ok", text: "Welcome series saved." });
      await load();
    }
  }

  async function onSaveFrom() {
    const json = await post({ action: "fromName", fromName }, "from");
    if (json?.ok) setBanner({ kind: "ok", text: `Sender name is ${json.fromName}.` });
  }

  if (!data) return <div className="pg"><p className="sub">Loading SUNDER email…</p></div>;
  if (!data.ok) {
    return (
      <div className="pg">
        <div className="ph"><div><h1>SUNDER email</h1><p className="sub">{data.error}</p></div></div>
      </div>
    );
  }

  const snap = data;
  const blank = !subject.trim() || !body.trim();

  return (
    <div className="pg">
      <div className="ph">
        <div>
          <h1>SUNDER email</h1>
          <p className="sub">Broadcasts and the welcome series go out through Amazon SES as {snap.fromEmail}, tenant {snap.sesTenantName || "sunder"}.</p>
        </div>
        <OnOff
          on={!snap.paused}
          label="Sending"
          busy={busy === "pause"}
          confirmOff={{ title: "Pause sending?", body: "Queued mail stays queued. Nothing goes out until you turn this back on.", confirmLabel: "Pause" }}
          onToggle={() => onPause(!snap.paused)}
        />
      </div>

      {banner && <div className={`em-banner ${banner.kind}`} role="status">{banner.text}</div>}
      {snap.paused && <div className="em-banner info">Sending is paused.</div>}
      {!snap.configSet && (
        <div className="em-banner info">
          No configuration set is attached, so this sends without bounce or complaint events. Wiring config set cs-sunder and the SNS topic needs the admin SES key. That is a follow-up, not required to send.
        </div>
      )}

      <div className="em-kpis">
        <div className="card em-kpi"><div className="em-note">Can email</div><b>{snap.counts.subscribed}</b><span>Confirmed. Existing waitlist consent counts.</span></div>
        <div className="card em-kpi"><div className="em-note">Waiting to confirm</div><b>{snap.counts.pending}</b><span>New signups. No marketing until they confirm.</span></div>
        <div className="card em-kpi"><div className="em-note">Unsubscribed</div><b>{snap.counts.unsubscribed}</b><span>Honoured immediately. Never mailed.</span></div>
        <div className="card em-kpi"><div className="em-note">Suppressed</div><b>{snap.counts.suppressed}</b><span>Checked again before every send.</span></div>
      </div>

      <div className="em" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 420px)", display: "grid" }}>
        <Card>
          <CardHeader title="Broadcast" action={<button type="button" className="btn sm" onClick={() => load()}>Refresh</button>} />
          <CardBody>
            <div className="em" >
              <label className="em-field">Sender name
                <input value={fromName} maxLength={80} onChange={(e) => setFromName(e.target.value)} />
              </label>
              <div className="em-row">
                <button type="button" className="btn sm" disabled={busy === "from"} onClick={onSaveFrom}>Save sender name</button>
                <span className="em-note">From {snap.fromEmail}. Default name is SUNDER.</span>
              </div>
              <label className="em-field">Subject
                <input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Use {{firstName|there}} if you want a name" />
              </label>
              <label className="em-field">Message
                <textarea rows={10} value={body} maxLength={8000} onChange={(e) => setBody(e.target.value)} placeholder={"Hi {{firstName|there}},\n\nOne paragraph per line."} />
              </label>
              <p className="em-note">Every email adds the sender, ABN, postal address, why they are getting it, and an unsubscribe link. One-click unsubscribe is on the message as well.</p>
              <label className="em-field">Send a test to one address
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="success@simulator.amazonses.com" />
              </label>
              <div className="em-row">
                <button type="button" className="btn" disabled={!!busy || blank || snap.paused} onClick={onTest}>{busy === "test" ? "Sending test…" : "Send test"}</button>
                {!confirming ? (
                  <button type="button" className="btn pri" disabled={!!busy || blank || snap.paused} onClick={() => setConfirming(true)}>Review and queue</button>
                ) : (
                  <>
                    <button type="button" className="btn pri" disabled={!!busy} onClick={onBroadcast}>{busy === "send" ? "Queuing…" : `Queue for ${snap.counts.subscribed} confirmed`}</button>
                    <button type="button" className="btn" disabled={!!busy} onClick={() => setConfirming(false)}>Cancel</button>
                  </>
                )}
              </div>
              <p className="em-note">The test uses the sample name Sam. Use the SES mailbox simulator until you want a real inbox. Queueing does not send in this request. The minute cron sends at 10 per second, under the 14 per second account limit.</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Preview" />
          <CardBody>
            <p className="em-note" style={{ marginTop: 0 }}><b>{preview.subject}</b><br />{preview.from}</p>
            <iframe className="em-preview" title="Email preview" sandbox="" srcDoc={preview.html} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Welcome series" action={
          <OnOff on={seriesOn} label="Welcome series" onToggle={() => setSeriesOn((v) => !v)} />
        } />
        <CardBody>
          <p className="em-note">Three emails from the moment someone confirms. Day 0, day 3 and day 7. People already on the waitlist are not enrolled. New confirmations are. Nothing sends between 9pm and 7am Brisbane time.</p>
          <div className="em">
            {steps.map((step, i) => (
              <div key={step.position} className="em" style={{ borderTop: i ? "1px solid var(--n-200)" : undefined, paddingTop: i ? 12 : 0 }}>
                <strong>Email {i + 1}</strong>
                <label className="em-field">Days after they confirm
                  <input type="number" min={0} max={365} value={step.delayDays} onChange={(e) => setSteps((prev) => prev.map((s, k) => k === i ? { ...s, delayDays: Number(e.target.value) } : s))} />
                </label>
                <label className="em-field">Subject
                  <input value={step.subject} maxLength={200} onChange={(e) => setSteps((prev) => prev.map((s, k) => k === i ? { ...s, subject: e.target.value } : s))} />
                </label>
                <label className="em-field">Message
                  <textarea rows={5} value={step.body} maxLength={8000} onChange={(e) => setSteps((prev) => prev.map((s, k) => k === i ? { ...s, body: e.target.value } : s))} />
                </label>
              </div>
            ))}
            <div className="em-row">
              <button type="button" className="btn pri" disabled={busy === "series"} onClick={onSaveSeries}>{busy === "series" ? "Saving…" : "Save series"}</button>
              <span className="em-note">{seriesOn ? "On. New confirmations are enrolled." : "Off. Nobody new is emailed this series until you turn it on. Remember to save."}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Report" />
        <CardBody>
          {!snap.campaigns.length && <p className="em-note">No campaigns yet. Opens are not tracked. Bounces and complaints land here after the config set follow-up.</p>}
          {!!snap.campaigns.length && (
            <table className="em-table">
              <thead><tr><th>Campaign</th><th>Status</th><th>Queued</th><th>Sent</th><th>Pending</th><th>Failed</th><th>Skipped</th></tr></thead>
              <tbody>
                {snap.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}<div className="em-note">{new Date(c.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", dateStyle: "medium", timeStyle: "short" })}</div></td>
                    <td>{c.status}</td>
                    <td>{c.queued}</td>
                    <td>{c.sent}</td>
                    <td>{c.pending}</td>
                    <td>{c.failed}</td>
                    <td>{c.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
