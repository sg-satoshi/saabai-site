"use client";

import { useEffect, useState } from "react";
import { AUTO_PAUSE_BOUNCE, AUTO_PAUSE_COMPLAINT, MIN_SENDS_FOR_RATES, REVIEW_BOUNCE, REVIEW_COMPLAINT } from "../../../../lib/email/gates";

type Health = {
  ok: true;
  paused: boolean;
  pauseReason: string;
  sends7d: number;
  rates: { bounce: number; complaint: number } | null;
  sentToday: number;
  dailyCap: number;
  configSet: string | null;
};

function Meter({ value, auto, review }: { value: number; auto: number; review: number }) {
  const pct = Math.min(100, (value / review) * 100);
  return (
    <div className="em-meter" aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
      <i style={{ left: `${(auto / review) * 100}%` }} title="Auto-pause" />
      <i className="review" style={{ left: "100%" }} title="Provider review" />
    </div>
  );
}

export default function Health() {
  const [data, setData] = useState<Health | null>(null);
  const [err, setErr] = useState("");
  const [cap, setCap] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/admin/email?view=health", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!j.ok) setErr(j.error || "Could not load health."); else { setData(j); setCap(String(j.dailyCap)); } })
      .catch(() => setErr("Check your connection and try again. Nothing was changed."));
  }
  useEffect(() => { load(); }, []);

  async function pause(paused: boolean) {
    setBusy(true);
    await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pause", paused }) });
    setBusy(false);
    load();
  }
  async function saveCap() {
    setBusy(true);
    const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cap", cap: Number(cap) }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!json.ok) { setErr(json.error || "Cap was not saved."); return; }
    setEditing(false);
    load();
  }

  const auto = data?.pauseReason && !/admin/i.test(data.pauseReason);
  return (
    <div className="em-page">
      <div className="ph">
        <div>
          <h1>Sending health</h1>
          <p className="sub">SUNDER tenant. Auto-pause at 4% bounce or 0.08% complaints, only after {MIN_SENDS_FOR_RATES} sends in 7 days.</p>
        </div>
        {data?.paused ? <span className="badge b-warn">Sending off</span> : <span className="badge b-ok">Sending on</span>}
      </div>
      {err && <div className="em-alert bad" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="bd" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button type="button" className={`em-switch ${data?.paused ? "off" : "on"}`} role="switch" aria-checked={!data?.paused} aria-label="Sending" disabled={busy} onClick={() => pause(!data?.paused)}><i /></button>
            <div>
              <b>{data?.paused ? "Sending is paused" : "Sending is on"}</b>
              <div className="em-help">Turning this off stops the queue at the next batch, within about a minute. Nothing is lost. It resumes where it stopped.</div>
            </div>
          </div>
          {data?.paused ? <button type="button" className="btn pri" disabled={busy} onClick={() => pause(false)}>Review and resume</button> : <button type="button" className="btn dg" disabled={busy} onClick={() => pause(true)}>Pause all sending</button>}
        </div>
      </div>

      {auto && <div className="em-alert bad" style={{ marginBottom: 16 }}>{data?.pauseReason}</div>}

      {!data?.rates && (
        <div className="card" style={{ marginBottom: 16 }}><div className="bd">
          <h2>no data</h2>
          <p className="em-help">Rates show once there are {MIN_SENDS_FOR_RATES} sends in the last 7 days. Below that, one bounce would swing the rate, so no rate is shown and no auto-pause fires on rate. Sends in the last 7 days: {data?.sends7d ?? "..."}.</p>
        </div></div>
      )}

      {data?.rates && (
        <div className="kpis" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="card"><div className="hd"><h2>Bounce rate, rolling 7 days</h2><span className="badge b-ok">Healthy</span></div>
            <div className="bd">
              <div className="v" style={{ fontFamily: "var(--font-admin-mono), var(--mono)", fontSize: 28 }}>{(data.rates.bounce * 100).toFixed(1)}%</div>
              <Meter value={data.rates.bounce} auto={AUTO_PAUSE_BOUNCE} review={REVIEW_BOUNCE} />
              <div className="em-help">0% · Auto-pause {(AUTO_PAUSE_BOUNCE * 100).toFixed(0)}% · Provider review {(REVIEW_BOUNCE * 100).toFixed(0)}%. Hard bounces are suppressed when events are connected.</div>
            </div>
          </div>
          <div className="card"><div className="hd"><h2>Complaint rate, rolling 7 days</h2><span className={`badge ${data.rates.complaint >= AUTO_PAUSE_COMPLAINT * 0.75 ? "b-warn" : "b-ok"}`}>{data.rates.complaint >= AUTO_PAUSE_COMPLAINT * 0.75 ? "Watch" : "Healthy"}</span></div>
            <div className="bd">
              <div className="v" style={{ fontFamily: "var(--font-admin-mono), var(--mono)", fontSize: 28 }}>{(data.rates.complaint * 100).toFixed(2)}%</div>
              <Meter value={data.rates.complaint} auto={AUTO_PAUSE_COMPLAINT} review={REVIEW_COMPLAINT} />
              <div className="em-help">Auto-pause {(AUTO_PAUSE_COMPLAINT * 100).toFixed(2)}% · Provider review {(REVIEW_COMPLAINT * 100).toFixed(1)}%. Complaints are suppressed and exit every series when events are connected.</div>
            </div>
          </div>
        </div>
      )}

      <div className="kpis" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card"><div className="hd"><h2>Daily cap</h2>{editing ? <button type="button" className="btn sm pri" disabled={busy} onClick={saveCap}>Save</button> : <button type="button" className="btn sm" onClick={() => setEditing(true)}>Edit</button>}</div>
          <div className="bd">
            {editing ? <label className="em-field">Cap<input value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" /></label> : <div style={{ fontFamily: "var(--font-admin-mono), var(--mono)", fontSize: 28 }}>{(data?.sentToday ?? 0).toLocaleString("en-AU")} of {(data?.dailyCap ?? 0).toLocaleString("en-AU")} today</div>}
            <p className="em-help">Warm-up steps: 500, 1,000, 2,000, 5,000 a day. Resets at midnight Brisbane time. The rest of a broadcast waits until 7:00am.</p>
          </div>
        </div>
        <div className="card"><div className="hd"><h2>Sender setup</h2><span className="badge b-ok">Ready to send</span></div>
          <div className="bd em-kv">
            <span>Domain signing</span><span className="badge b-n">Not checked here</span>
            <span>Return path</span><span className="badge b-n">Not checked here</span>
            <span>Policy record</span><span className="badge b-warn">{data?.configSet ? "Events on" : "Monitor only"}</span>
          </div>
          <p className="em-help" style={{ padding: "0 20px 16px" }}>Bounce and complaint events need a configuration set. Until that is connected, rates only count suppressions recorded in this app.</p>
        </div>
      </div>
    </div>
  );
}
