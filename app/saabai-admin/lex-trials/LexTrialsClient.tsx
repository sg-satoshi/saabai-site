"use client";
/** Lex free trials: invite codes (single-use, 14 days by default) and trial firms with usage, days left and invite source. Light mode, navy buttons. */
import { useCallback, useEffect, useState } from "react";

type Founding = { enabled: boolean; deadline: string | null; cap: number | null; used: number; priceConfigured: boolean };
type Invite = { code: string; label: string; maxUses: number; uses: number; expiresAt: string; state: string; createdAt: string };
type Trial = {
  firmId: string; firmName: string; adminEmail: string; domain: string; ownerName: string; phone: string | null; address: string | null; revokedAt: string | null; createdAt: string; status: string; lapseReason: string | null; seatsUsed: number;
  daysLeft: number | null; stage: string | null; trialEndsAt: string | null; inviteCode: string | null; inviteSource: string | null;
  converted: boolean; founding: boolean; dataDeleteAfter: string | null; usageToday: { reviews: number; compares: number } | null;
};
const navy: React.CSSProperties = { background: "#1b2559", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const plain: React.CSSProperties = { background: "#fff", color: "#1b2559", border: "1px solid #cfd4dd", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" };
const cell: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #eef0f3", fontSize: 13, textAlign: "left", verticalAlign: "top" };
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" }) : "");

export default function LexTrialsClient() {
  const [data, setData] = useState<{ trials: Trial[]; invites: Invite[]; founding?: Founding } | null>(null);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [days, setDays] = useState(14);
  const [fd, setFd] = useState<{ enabled: boolean; deadline: string; cap: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => { fetch("/api/admin/lex-trials").then((r) => r.json()).then((d) => { setData(d); const f = d?.founding as Founding | undefined; if (f) setFd((cur) => cur ?? { enabled: f.enabled, deadline: f.deadline ? new Date(f.deadline).toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" }) : "", cap: f.cap === null ? "" : String(f.cap) }); }).catch(() => setMsg("Could not load")); }, []);
  useEffect(load, [load]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function post(body: object) {
    setMsg(null);
    const r = await fetch("/api/admin/lex-trials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(d.error || "Something went wrong");
    else if (d.invite) { setMsg(`Created ${d.invite.code}`); setLabel(""); }
    else if (d.founding) setMsg("Founding offer saved");
    load();
  }

  return (
    <div style={{ padding: 24, color: "#111827", background: "#f5f5f7", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Lex free trials</h1>
      <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 18px" }}>Invite-only, 60 days, no card. Ended trials lapse and their data is deleted 30 days after the trial end (clause 10.7 sweep, dry_run unless LEX_DATA_DELETION_MODE=live).</p>

      <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 10px" }}>New invite</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ fontSize: 12 }}>Source / label<br /><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. LinkedIn intro, Jane Smith" style={{ padding: 7, border: "1px solid #cfd4dd", borderRadius: 8, width: 240 }} /></label>
          <label style={{ fontSize: 12 }}>Uses<br /><input type="number" min={1} max={500} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} style={{ padding: 7, border: "1px solid #cfd4dd", borderRadius: 8, width: 80 }} /></label>
          <label style={{ fontSize: 12 }}>Expires in days<br /><input type="number" min={1} max={180} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ padding: 7, border: "1px solid #cfd4dd", borderRadius: 8, width: 80 }} /></label>
          <button type="button" style={navy} onClick={() => post({ action: "create", label, maxUses, expiresInDays: days })}>Create invite</button>
        </div>
        {msg ? <p role="status" style={{ fontSize: 13, color: "#1b2559" }}>{msg}</p> : null}
      </section>

      <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 6px" }}>Founding offer</h2>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>Trials started while this is on, by the deadline (end of day, Brisbane) and under the cap, are founding members and convert at the founding price. {data?.founding ? `${data.founding.used} founding places used. ` : ""}{data?.founding && !data.founding.priceConfigured ? "STRIPE_PRICE_LEX_FOUNDING is not set, so founding firms currently pay the normal price." : ""}</p>
        {fd ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={fd.enabled} onChange={(e) => setFd({ ...fd, enabled: e.target.checked })} /> On</label>
            <label style={{ fontSize: 12 }}>Deadline<br /><input type="date" value={fd.deadline} onChange={(e) => setFd({ ...fd, deadline: e.target.value })} style={{ padding: 7, border: "1px solid #cfd4dd", borderRadius: 8 }} /></label>
            <label style={{ fontSize: 12 }}>Cap (blank = none)<br /><input type="number" min={0} value={fd.cap} onChange={(e) => setFd({ ...fd, cap: e.target.value })} style={{ padding: 7, border: "1px solid #cfd4dd", borderRadius: 8, width: 100 }} /></label>
            <button type="button" style={navy} onClick={() => post({ action: "founding", enabled: fd.enabled, deadline: fd.deadline, cap: fd.cap })}>Save founding offer</button>
          </div>
        ) : null}
      </section>

      <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16, marginBottom: 20, overflowX: "auto" }}>
        <h2 style={{ fontSize: 15, margin: "0 0 10px" }}>Invites</h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{["Code", "Source", "Used", "Expires", "State", "Link", ""].map((h) => <th key={h} style={{ ...cell, color: "#6b7280", fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.invites ?? []).map((i) => (
              <tr key={i.code}>
                <td style={{ ...cell, fontFamily: "monospace" }}>{i.code}</td><td style={cell}>{i.label}</td><td style={cell}>{i.uses} / {i.maxUses}</td>
                <td style={cell}>{day(i.expiresAt)}</td><td style={cell}>{i.state.replace("_", " ")}</td>
                <td style={cell}><button type="button" style={plain} onClick={() => navigator.clipboard?.writeText(`${origin}/lex/signup/trial?code=${i.code}`)}>Copy link</button></td>
                <td style={cell}>{i.state === "open" ? <button type="button" style={plain} onClick={() => post({ action: "revoke", code: i.code })}>Revoke</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16, overflowX: "auto" }}>
        <h2 style={{ fontSize: 15, margin: "0 0 10px" }}>Trial firms ({data?.trials.length ?? 0})</h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{["Firm", "Domain", "Owner", "Phone", "Address", "Created", "Founding", "Status", "Days left", "Seats", "Usage today", "Invite source", "Ends", "Data delete after", ""].map((h) => <th key={h} style={{ ...cell, color: "#6b7280", fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.trials ?? []).map((t) => (
              <tr key={t.firmId}>
                <td style={cell}>{t.firmName}</td><td style={cell}>{t.domain}</td><td style={cell}>{t.ownerName}<br /><span style={{ color: "#6b7280" }}>{t.adminEmail}</span></td>
                <td style={cell}>{t.phone ?? "–"}</td><td style={cell}>{t.address ?? "–"}</td><td style={cell}>{day(t.createdAt)}</td><td style={cell}>{t.founding ? "yes" : ""}</td>
                <td style={cell}>{t.converted && t.status === "active" ? "subscribed" : t.lapseReason === "trial_ended" ? "trial ended" : t.status}{t.stage && t.stage !== "none" ? ` (${t.stage})` : ""}</td>
                <td style={cell}>{t.daysLeft ?? "–"}</td><td style={cell}>{t.seatsUsed} / 3</td>
                <td style={cell}>{t.usageToday ? `${t.usageToday.reviews} reviews, ${t.usageToday.compares} compares` : "–"}</td>
                <td style={cell}>{t.inviteSource ?? ""} <span style={{ color: "#9ca3af", fontFamily: "monospace" }}>{t.inviteCode ?? ""}</span></td>
                <td style={cell}>{day(t.trialEndsAt)}</td><td style={cell}>{day(t.dataDeleteAfter)}</td>
                <td style={cell}>{t.status === "trial" && !t.converted ? <button type="button" style={plain} onClick={() => { if (window.confirm(`End the free trial for ${t.firmName} (${t.domain}) now? Their Lex access stops straight away.`)) void post({ action: "revokeTrial", firmId: t.firmId }); }}>Revoke trial</button> : t.revokedAt ? `revoked ${day(t.revokedAt)}` : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
