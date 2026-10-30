"use client";
import { useEffect, useState } from "react";

interface Step { key: string; label: string; count: number; rate: number | null; of: string }
interface Msg { role: "user" | "assistant"; content: string; at: string }
interface Data {
  funnel: { month: string; steps: Step[] };
  transcriptsEnabled: boolean; transcriptsAvailable: boolean; retentionDays: number;
  transcripts: Array<{ id: string; startedAt: string; messages: Msg[] }>;
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginTop: 16 };

/** Funnel counts and rates plus transcripts. `endpoint` is already scoped by the caller's auth. */
export default function InsightsPanel({ endpoint, variant = "portal" }: { endpoint: string; variant?: "portal" | "admin" }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const admin = variant === "admin";
  useEffect(() => {
    let live = true;
    fetch(endpoint, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Data) => { if (live) setData(j); })
      .catch(() => { if (live) setErr("Couldn't load chatbot insights."); });
    return () => { live = false; };
  }, [endpoint]);
  if (err) return <div style={card} role="alert">{err}</div>;
  if (!data) return <div style={card}>Loading insights...</div>;
  const shell = admin
    ? { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 0, marginTop: 0, boxShadow: "0 1px 2px rgba(0,0,0,.05)" }
    : card;
  const pad = admin ? { padding: "20px 24px" } : undefined;
  return (
    <div className={admin ? "au-stack" : undefined} data-testid={admin ? "chat-history-insights" : undefined}>
      <div style={shell} data-testid="insights-funnel">
        <div style={pad}>
          <h3 style={{ margin: "0 0 8px", color: "#0b092e" }}>Conversion funnel ({data.funnel.month})</h3>
          <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13 }}>Counts only. We never store what people type into form fields here.</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {data.funnel.steps.map((s) => (
                <tr key={s.key} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 0" }}>{s.label}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }} className="num">{s.count}</td>
                  <td style={{ textAlign: "right", color: "#64748b", width: 90 }}>{s.rate === null ? "" : `${s.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ ...shell, marginTop: admin ? 0 : 16 }} data-testid="insights-transcripts">
        <div style={pad}>
          <h3 style={{ margin: "0 0 8px", color: "#0b092e" }}>Transcripts (last {data.retentionDays} days)</h3>
          {!data.transcriptsEnabled ? <p style={{ color: "#64748b" }}>Transcripts are turned off for this chatbot.</p>
            : !data.transcriptsAvailable ? <p style={{ color: "#64748b" }} data-testid="transcripts-unavailable">Transcripts aren&apos;t available right now.</p>
            : data.transcripts.length === 0 ? <p style={{ color: "#64748b" }} data-testid="transcripts-empty">No chats yet.</p>
            : data.transcripts.map((t) => (
              <div key={t.id} style={{ borderTop: "1px solid #f1f5f9", padding: "10px 0" }}>
                <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)}
                  className={admin ? "btn pri sm" : undefined}
                  style={admin ? undefined : { background: "#0b1f3a", color: "#fff", border: 0, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                  {new Date(t.startedAt).toLocaleString("en-AU")} ({t.messages.length} messages)
                </button>
                {open === t.id && t.messages.map((m, i) => (
                  <p key={i} style={{ margin: "8px 0", whiteSpace: "pre-wrap", fontSize: 14 }}>
                    <strong>{m.role === "user" ? "Visitor" : "Bot"}:</strong> {m.content}
                  </p>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
