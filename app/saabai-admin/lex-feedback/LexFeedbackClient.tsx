"use client";
/** Lex feedback triage inbox: filter, status, tags, note, screenshot, count per firm, CSV export. Light mode, navy buttons. */
import { useCallback, useEffect, useState } from "react";

type Item = { id: string; type: string; message: string; status: string; tags: string[]; source: string; hasScreenshot: boolean; page: string; firm: string; user: string; browser: string; appVersion: string; createdAt: string; adminNote?: string };
type FirmRow = { firm: string; total: number; open: number };
const STATUSES = ["new", "triaged", "planned", "fixed", "wont_do"];
const TYPES = ["bug", "idea", "question", "answer_flag"];
const label = (s: string) => s.replace("_", " ").replace("wont do", "won't do");
const navy: React.CSSProperties = { background: "#1b2559", color: "#fff", border: 0, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" };
const input: React.CSSProperties = { padding: 6, border: "1px solid #cfd4dd", borderRadius: 8, fontSize: 13, background: "#fff" };
const card: React.CSSProperties = { background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 14, marginBottom: 12 };
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function LexFeedbackClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [byFirm, setByFirm] = useState<FirmRow[]>([]);
  const [f, setF] = useState({ status: "", type: "", firm: "", tag: "" });
  const [err, setErr] = useState<string | null>(null);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const load = useCallback(() => {
    fetch(`/api/admin/lex-feedback?${qs}`).then((r) => r.json()).then((d) => { setItems(d.items ?? []); setByFirm(d.byFirm ?? []); }).catch(() => setErr("Could not load"));
  }, [qs]);
  useEffect(load, [load]);

  async function save(id: string, patch: Partial<Item>) {
    const r = await fetch("/api/admin/lex-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.item) setItems((xs) => xs.map((x) => (x.id === id ? d.item : x))); else setErr(d.error || "Could not save");
  }

  return (
    <div style={{ padding: 24, color: "#111827", background: "#f5f5f7", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Lex feedback</h1>
        <a style={navy} href={`/api/admin/lex-feedback?${qs}${qs ? "&" : ""}format=csv`}>Export CSV</a>
      </div>
      <p style={{ color: "#6b7280", fontSize: 13 }}>From the in-app button and answer flags. Emails and phone numbers are masked on save. Screenshots are kept 90 days.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <select aria-label="Status" style={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
        <select aria-label="Type" style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">All types</option>{TYPES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
        <select aria-label="Firm" style={input} value={f.firm} onChange={(e) => setF({ ...f, firm: e.target.value })}><option value="">All firms</option>{byFirm.map((r) => <option key={r.firm} value={r.firm}>{r.firm}</option>)}</select>
        <input aria-label="Tag" placeholder="tag" style={input} value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value.trim().toLowerCase() })} />
      </div>
      {err ? <p role="alert" style={{ color: "#b42318" }}>{err}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 240px", gap: 16 }}>
        <div>
          {items.length === 0 ? <p style={{ color: "#6b7280" }}>Nothing here.</p> : null}
          {items.map((it) => (
            <div key={it.id} style={card} id={it.id}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "#6b7280" }}>
                <strong style={{ color: "#1b2559", textTransform: "uppercase" }}>{label(it.type)}</strong>
                <span>{it.firm}</span><span>{it.user}</span><span>{when(it.createdAt)}</span><span>{it.page}</span><span>v {it.appVersion}</span>
              </div>
              <p style={{ whiteSpace: "pre-wrap", fontSize: 14, margin: "8px 0" }}>{it.message}</p>
              {it.hasScreenshot ? <a href={`/api/admin/lex-feedback?shot=${it.id}`} target="_blank" rel="noopener" style={{ fontSize: 12, color: "#1b2559" }}>View screenshot</a> : null}
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 8px" }}>{it.browser}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select aria-label="Set status" style={input} value={it.status} onChange={(e) => save(it.id, { status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
                <input aria-label="Tags" style={{ ...input, width: 200 }} defaultValue={it.tags.join(", ")} placeholder="tags, comma separated" onBlur={(e) => save(it.id, { tags: e.target.value.split(",") as unknown as string[] })} />
                <input aria-label="Admin note" style={{ ...input, flex: 1, minWidth: 160 }} defaultValue={it.adminNote ?? ""} placeholder="note (internal)" onBlur={(e) => save(it.id, { adminNote: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
        <aside style={card}>
          <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Per firm</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left" }}>Firm</th><th>Open</th><th>All</th></tr></thead>
            <tbody>{byFirm.map((r) => <tr key={r.firm}><td style={{ padding: "3px 0" }}>{r.firm}</td><td style={{ textAlign: "center" }}>{r.open}</td><td style={{ textAlign: "center" }}>{r.total}</td></tr>)}</tbody>
          </table>
        </aside>
      </div>
    </div>
  );
}
