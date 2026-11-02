"use client";

import { useEffect, useState } from "react";

type Person = {
  id: string;
  email: string;
  first_name: string | null;
  status: string;
  consent_source: string | null;
  consent_text: string | null;
  consent_version: string | null;
  consent_at: string | null;
  confirmed_at: string | null;
  suppressed: boolean;
  reason: string;
};

type Payload = { ok: true; people: Person[]; counts: { confirmed: number; pending: number; unsubscribed: number; suppressed: number } };

function statusChip(p: Person) {
  if (p.suppressed || p.status === "bounced" || p.status === "complained") {
    const why = /complaint/i.test(p.reason) || p.status === "complained" ? "complaint" : "bounce";
    return <span className="badge b-bad">Suppressed: {why}</span>;
  }
  if (p.status === "pending") return <span className="badge b-warn">Pending</span>;
  if (p.status === "unsubscribed") return <span className="badge b-n">Unsubscribed</span>;
  if (p.status === "subscribed") return <span className="badge b-ok">Confirmed</span>;
  return <span className="badge b-n">{p.status}</span>;
}

export default function Subscribers() {
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Person | null>(null);
  const [csv, setCsv] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [note, setNote] = useState("");

  function load(nextStatus = status, nextQ = q) {
    const params = new URLSearchParams({ view: "subscribers", status: nextStatus, q: nextQ });
    fetch(`/api/admin/email?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!j.ok) setErr(j.error || "Could not load subscribers."); else { setErr(""); setData(j); } })
      .catch(() => setErr("Check your connection and try again. Nothing was changed."));
  }
  useEffect(() => { load("all", ""); }, []);

  async function doImport() {
    const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", csv }) });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) { setNote(json.error || "Import did not run."); return; }
    setNote(`Added ${json.added}. Skipped ${json.skipped} already on the list. New rows stay pending until they confirm.`);
    setImportOpen(false);
    load();
  }

  function exp() {
    const rows = data?.people || [];
    const body = ["email,status,consent_source,consent_at", ...rows.map((p) => [p.email, p.status, p.consent_source || "", p.consent_at || ""].join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = "sunder-subscribers.csv";
    a.click();
  }

  return (
    <div className="em-page">
      <div className="ph">
        <div>
          <h1>Subscribers</h1>
          <p className="sub">Double opt-in. Pending means the confirm email has not been clicked yet. Pending people get no marketing email. Every row keeps consent source, wording, version and time.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={exp} disabled={!data?.people.length}>Export</button>
          <button type="button" className="btn pri" onClick={() => setImportOpen(true)}>Import CSV</button>
        </div>
      </div>
      {note && <div className="em-alert info" style={{ marginBottom: 12 }}>{note}</div>}
      <div className="kpis">
        <div className="card kpi"><div className="l">Confirmed</div><div className="v">{data?.counts.confirmed ?? "..."}</div></div>
        <div className="card kpi"><div className="l">Pending confirm</div><div className="v">{data?.counts.pending ?? "..."}</div></div>
        <div className="card kpi"><div className="l">Unsubscribed</div><div className="v">{data?.counts.unsubscribed ?? "..."}</div></div>
        <div className="card kpi"><div className="l">Suppressed</div><div className="v">{data?.counts.suppressed ?? "..."}</div><div className="d">Bounce or complaint</div></div>
      </div>
      <div className="card">
        <div className="fbar">
          <label className="inp" style={{ width: 240 }}><input aria-label="Search email" value={q} placeholder="Search email" onChange={(e) => setQ(e.target.value)} style={{ border: 0, width: "100%", font: "inherit" }} /></label>
          <label className="em-help">Status
            <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value, q); }} style={{ marginLeft: 8, height: 36 }}>
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="suppressed">Suppressed</option>
            </select>
          </label>
          <button type="button" className="btn sm" onClick={() => { setQ(""); setStatus("all"); load("all", ""); }}>Clear</button>
          <span className="em-help" style={{ marginLeft: "auto" }}>{data ? `${data.people.length} shown` : ""}</span>
        </div>
        {err && <div className="bd"><div className="em-alert bad">{err}</div></div>}
        {data && !data.people.length && (
          <div className="em-empty"><h2>No subscribers match these filters</h2><p>Try another status or clear the filters.</p></div>
        )}
        {!!data?.people.length && (
          <table>
            <thead><tr><th>Email</th><th>Status</th><th>Consent source</th><th>Consent time</th><th></th></tr></thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id}>
                  <td>{p.email}</td>
                  <td>{statusChip(p)}</td>
                  <td>{p.consent_source || "Waitlist"}</td>
                  <td>{p.consent_at ? new Date(p.consent_at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}</td>
                  <td><button type="button" className="btn sm" onClick={() => setOpen(p)}>View consent</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="em-alert warn" style={{ marginTop: 12 }}>Suppressed and unsubscribed people are never mailed and cannot be re-added from here. They can only rejoin by signing up again.</div>

      {open && (
        <div className="drawer-detail" role="presentation" onClick={() => setOpen(null)}>
          <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="consent-h" onClick={(e) => e.stopPropagation()}>
            <div className="hd"><h2 id="consent-h">{open.email}</h2><button type="button" className="btn sm" onClick={() => setOpen(null)}>Close</button></div>
            <div className="bd">
              {statusChip(open)}
              <dl className="em-kv">
                <span>Source</span><b>{open.consent_source || "Waitlist"}</b>
                <span>Version</span><b>{open.consent_version || ""}</b>
                <span>Consent time</span><b>{open.consent_at || ""}</b>
                <span>Confirmed</span><b>{open.confirmed_at || "Not yet"}</b>
              </dl>
              <p>{open.consent_text || "No wording stored."}</p>
              {open.suppressed && <p className="em-help">This row is read only. It is not in any audience.</p>}
            </div>
          </aside>
        </div>
      )}

      {importOpen && (
        <div className="em-modal">
          <div className="em-dialog" role="dialog" aria-modal="true" aria-labelledby="imp-h">
            <h2 id="imp-h">Import CSV</h2>
            <p className="em-help">Header: email, first_name, consent_source. Every row needs a consent source. Imported people stay pending until they confirm. They are not mailed before that.</p>
            <textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} aria-label="CSV" style={{ width: "100%", font: "inherit" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn" onClick={() => setImportOpen(false)}>Cancel</button>
              <button type="button" className="btn pri" onClick={doImport}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
