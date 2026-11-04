"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CampaignView, EmailAdminSnapshot } from "../../../lib/email/types";

type Load = EmailAdminSnapshot | { ok: false; error?: string } | null;

function chip(c: CampaignView, paused: boolean) {
  if (paused && c.status === "sending") return <span className="badge b-warn">Paused</span>;
  if (c.status === "scheduled") return <span className="badge b-sched">Scheduled</span>;
  if (c.status === "sending") return <span className="badge b-sending">Sending</span>;
  if (c.status === "sent") return <span className="badge b-ok">Sent</span>;
  if (c.status === "cancelled") return <span className="badge b-n">Cancelled</span>;
  return <span className="badge b-n">Draft</span>;
}

function when(c: CampaignView, paused: boolean) {
  const stamp = c.status === "scheduled" && c.scheduledAt ? c.scheduledAt : c.createdAt;
  const at = new Date(stamp).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  if (paused && c.status === "sending") return "Paused";
  if (c.status === "sending") return `Started ${at}`;
  if (c.status === "scheduled") return at;
  if (c.status === "sent") return at;
  return `Edited ${at}`;
}

function num(n: number) {
  return n ? n.toLocaleString("en-AU") : "-";
}

export default function Campaigns() {
  const [data, setData] = useState<Load>(null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [sender, setSender] = useState<string | null>(null);
  const [senderMsg, setSenderMsg] = useState("");
  const [senderBusy, setSenderBusy] = useState(false);

  async function saveSender(name: string) {
    setSenderBusy(true); setSenderMsg("");
    const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fromName", fromName: name }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setSenderBusy(false);
    if (!j.ok) { setSenderMsg(j.error || "Could not save. Nothing changed."); return; }
    setSender(j.fromName); setSenderMsg("Saved. New broadcasts and the welcome emails use this name.");
  }

  function load() {
    setErr("");
    fetch("/api/admin/email", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!j.ok) setErr(j.error || "Could not load campaigns."); setData(j); })
      .catch(() => { setErr("Check your connection and try again. Nothing was sent or changed."); setData({ ok: false }); });
  }
  useEffect(() => { load(); }, []);

  const rows = data && data.ok ? data.campaigns : [];
  const counts = useMemo(() => {
    const n = (s: string) => rows.filter((c) => (s === "paused" ? c.status === "sending" && data && data.ok && data.paused : c.status === s)).length;
    return { all: rows.length, draft: n("draft"), scheduled: n("scheduled"), sending: n("sending"), sent: n("sent"), paused: data && data.ok && data.paused ? rows.filter((c) => c.status === "sending").length : 0 };
  }, [rows, data]);
  const shown = rows.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (tab === "all") return true;
    if (tab === "paused") return c.status === "sending" && data && data.ok && data.paused;
    return c.status === tab;
  });

  function exp() {
    const head = "Campaign,Status,Sent,Pending,Failed,Skipped";
    const body = shown.map((c) => [c.name, c.status, c.sent, c.pending, c.failed, c.skipped].join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sunder-campaigns.csv";
    a.click();
  }

  const snap = data && data.ok ? data : null;
  const unsubRate = snap && snap.sent30 > 0 ? `${((snap.unsub30 / snap.sent30) * 100).toFixed(1)}%` : "no data";

  return (
    <div className="em-page">
      <div className="ph">
        <div>
          <h1>Campaigns</h1>
          <p className="sub">One-off broadcasts for SUNDER. Opens are indicative only.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {snap?.paused ? <span className="badge b-warn">Sending off</span> : <span className="badge b-ok">Sending on</span>}
          <button type="button" className="btn" onClick={exp} disabled={!shown.length}>Export</button>
          <Link href="/saabai-admin/email/new" className="btn pri">New broadcast</Link>
        </div>
      </div>

      <div className="card em-sender">
        <div className="hd"><h2>Default sender</h2><span className="em-help">Used by new broadcasts and the confirm and welcome emails</span></div>
        <div className="bd" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="em-field" style={{ flex: "1 1 260px" }}>From name
            <input value={sender ?? (snap?.fromName || "")} maxLength={80} disabled={!snap} onChange={(e) => setSender(e.target.value)} />
            <span className="em-help">{senderMsg || `Inbox shows: ${(sender ?? snap?.fromName) || "SUNDER Pickleball"} <${snap?.fromEmail || "hello@sunder.com.au"}>`}</span>
          </label>
          <button type="button" className="btn pri" style={{ marginBottom: 22 }} disabled={!snap || senderBusy || sender === null || sender.trim() === (snap?.fromName || "")} onClick={() => saveSender(sender || "")}>{senderBusy ? "Saving" : "Save"}</button>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi"><div className="l">Sent, last 30 days</div><div className="v">{snap ? snap.sent30.toLocaleString("en-AU") : "..."}</div><div className="d">Confirmed recipients only</div></div>
        <div className="card kpi"><div className="l">Open rate (indicative)</div><div className="v">no data</div><div className="d">Not measured on this account yet</div></div>
        <div className="card kpi"><div className="l">Click rate</div><div className="v">no data</div><div className="d">Not measured on this account yet</div></div>
        <div className="card kpi"><div className="l">Unsubscribe rate</div><div className="v">{unsubRate}</div><div className="d">{snap && snap.sent30 > 0 ? "Last 30 days" : "Needs sends in the last 30 days"}</div></div>
      </div>

      <div className="card">
        <div className="em-filters">
          <div className="tabs" role="tablist" aria-label="Campaign status">
            {[["all", "All", counts.all], ["draft", "Draft", counts.draft], ["scheduled", "Scheduled", counts.scheduled], ["sending", "Sending", counts.sending], ["sent", "Sent", counts.sent], ["paused", "Paused", counts.paused]].map(([id, label, n]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(String(id))}>{label} <span className="num">{n}</span></button>
            ))}
          </div>
          <label className="inp em-filter-search" style={{ width: "min(100%, 280px)" }}>
            <input aria-label="Search campaigns" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns" style={{ border: 0, outline: 0, width: "100%", font: "inherit", background: "transparent" }} />
          </label>
        </div>
        {!data && <div className="bd">{[1, 2, 3, 4].map((i) => <div key={i} className="em-skel" style={{ width: `${80 - i * 10}%` }} />)}</div>}
        {err && (
          <div className="bd">
            <div className="em-alert bad" role="alert"><b>Could not load campaigns.</b><div>{err}</div></div>
            <button type="button" className="btn" style={{ marginTop: 12 }} onClick={load}>Try again</button>
          </div>
        )}
        {data && !err && !shown.length && (
          <div className="em-empty">
            <h2>No campaigns yet</h2>
            <p>Write your first broadcast to the SUNDER waitlist.</p>
            <Link href="/saabai-admin/email/new" className="btn pri" style={{ marginTop: 12 }}>New broadcast</Link>
          </div>
        )}
        {!!shown.length && (
          <>
            <div className="em-mob">
              {shown.map((c) => (
                <Link key={c.id} className="oc" href={`/saabai-admin/email/${c.id}`}>
                  <b>{c.name}</b>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>{chip(c, !!(snap && snap.paused))}<span className="em-help">{when(c, !!(snap && snap.paused))}</span></div>
                </Link>
              ))}
            </div>
            <table className="em-desk">
              <thead><tr><th>Campaign</th><th>Status</th><th className="r">Sent</th><th className="r">Open</th><th className="r">Click</th><th className="r">Unsub</th><th>When</th><th></th></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: "normal" }}><Link href={`/saabai-admin/email/${c.id}`} className="btn gh" style={{ height: "auto", minHeight: 44, paddingLeft: 0 }}>{c.name}</Link><div className="em-help">Waitlist, confirmed only</div></td>
                    <td>{chip(c, !!(snap && snap.paused))}</td>
                    <td className="num r">{c.status === "sending" ? `${c.sent.toLocaleString("en-AU")} of ${c.queued.toLocaleString("en-AU")}` : num(c.sent)}</td>
                    <td className="r">no data</td>
                    <td className="r">no data</td>
                    <td className="num r">{num(c.unsubscribed)}</td>
                    <td>{when(c, !!(snap && snap.paused))}</td>
                    <td><Link href={`/saabai-admin/email/${c.id}`} className="btn sm" aria-label={`Open ${c.name}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
