"use client";

import { useEffect, useState } from "react";
import type { RedactionEntry } from "../../../lib/lex-privacy/redaction-log";

const C = {
  surface: "#ffffff", border: "rgba(0,0,0,0.08)", text: "#111827", dim: "#6b7280",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.08)", red: "#dc2626", redBg: "rgba(220,38,38,0.08)",
  amber: "#d97706", amberBg: "rgba(217,119,6,0.08)",
};

const ROUTE_LABEL: Record<string, string> = {
  "lex-chat": "Intake chat", "lex-research": "Research", "lex-answer-check": "Confidence check",
  "lex-draft": "Drafting", "lex-draft-qa": "Drafting QA", "lex-review": "Doc review",
  "lex-compare": "Compare", "lex-settings-test": "LLM settings test",
};

function brisbane(ts: number): string {
  return new Date(ts).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function Outcome({ o, reason }: { o: RedactionEntry["outcome"]; reason?: string }) {
  const style = o === "pass" ? { c: C.green, bg: C.greenBg, t: "Masked and sent" } : o === "blocked" ? { c: C.red, bg: C.redBg, t: "Blocked, nothing sent" } : { c: C.amber, bg: C.amberBg, t: "Model error" };
  return (
    <span title={reason ?? ""} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, color: style.c, background: style.bg, whiteSpace: "nowrap" }}>
      {style.t}
    </span>
  );
}

export default function LexPrivacyClient() {
  const [firms, setFirms] = useState<string[]>([]);
  const [firm, setFirm] = useState("");
  const [entries, setEntries] = useState<RedactionEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/lex-redaction-log")
      .then((r) => r.json())
      .then((d) => {
        const list: string[] = d.firms ?? [];
        setFirms(list);
        if (list.length) setFirm(list[0]);
        else setLoading(false);
      })
      .catch(() => { setError("Could not load the privacy log."); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!firm) return;
    setLoading(true);
    fetch(`/api/admin/lex-redaction-log?firm=${encodeURIComponent(firm)}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setError("Could not load the privacy log."))
      .finally(() => setLoading(false));
  }, [firm]);

  const sent = entries.filter((e) => e.outcome === "pass").length;
  const blocked = entries.filter((e) => e.outcome === "blocked").length;
  const masked = entries.reduce((a, e) => a + e.total, 0);

  return (
    <div style={{ padding: 24, color: C.text }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Lex privacy log</h1>
      <p style={{ color: C.dim, fontSize: 13, maxWidth: 720 }}>
        Every Lex AI request, per firm. It shows what kinds of client details were masked and how many,
        never the details themselves. Times are Brisbane time.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0" }}>
        <label htmlFor="firm" style={{ fontSize: 13, fontWeight: 600 }}>Firm</label>
        <select id="firm" value={firm} onChange={(e) => setFirm(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>
          {firms.length === 0 && <option value="">No requests logged yet</option>}
          {firms.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {error && <p style={{ color: C.red }}>{error}</p>}

      {firm && !loading && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {[["Requests", entries.length], ["Masked and sent", sent], ["Blocked", blocked], ["Details masked", masked]].map(([k, v]) => (
            <div key={String(k)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", minWidth: 120 }}>
              <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <p style={{ color: C.dim }}>Loading...</p> : entries.length === 0 ? (
        firm ? <p style={{ color: C.dim }}>No requests logged for this firm yet.</p> : null
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: C.dim, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {["When", "Tool", "Result", "Masked", "Search results masked", "Model", "Masker"].map((h) => <th key={h} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={`${e.requestId}-${i}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{brisbane(e.ts)}</td>
                  <td style={{ padding: "8px 12px" }}>{ROUTE_LABEL[e.route] ?? e.route}</td>
                  <td style={{ padding: "8px 12px" }}><Outcome o={e.outcome} reason={e.reason} /></td>
                  <td style={{ padding: "8px 12px" }}>
                    {e.total === 0 ? <span style={{ color: C.dim }}>None found</span> : Object.entries(e.types).map(([t, n]) => `${t.toLowerCase()} ${n}`).join(", ")}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    {e.tools.calls === 0 ? <span style={{ color: C.dim }}>No searches</span> : `${e.tools.resultsMasked} of ${e.tools.calls}${e.tools.resultsBlocked ? `, ${e.tools.resultsBlocked} blocked` : ""}`}
                  </td>
                  <td style={{ padding: "8px 12px", color: C.dim }}>{e.model}</td>
                  <td style={{ padding: "8px 12px", color: C.dim }}>{e.masker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
