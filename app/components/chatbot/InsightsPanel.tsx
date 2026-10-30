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
export default function InsightsPanel({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch(endpoint, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Data) => { if (live) setData(j); })
      .catch(() => { if (live) setErr("Couldn't load chatbot insights."); });
    return () => { live = false; };
  }, [endpoint]);
  if (err) return <div style={card}>{err}</div>;
  if (!data) return <div style={card}>Loading insights...</div>;
  return (
    <>
      <div style={card}>
        <h3 style={{ margin: "0 0 8px", color: "#0b1f3a" }}>Conversion funnel ({data.funnel.month})</h3>
        <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13 }}>Counts only. We never store what people type into form fields here.</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {data.funnel.steps.map((s) => (
              <tr key={s.key} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 0" }}>{s.label}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{s.count}</td>
                <td style={{ textAlign: "right", color: "#6b7280", width: 90 }}>{s.rate === null ? "" : `${s.rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={card}>
        <h3 style={{ margin: "0 0 8px", color: "#0b1f3a" }}>Transcripts (last {data.retentionDays} days)</h3>
        {!data.transcriptsEnabled ? <p style={{ color: "#6b7280" }}>Transcripts are turned off for this chatbot.</p>
          : !data.transcriptsAvailable ? <p style={{ color: "#6b7280" }}>Transcripts aren&apos;t available right now.</p>
          : data.transcripts.length === 0 ? <p style={{ color: "#6b7280" }}>No chats yet.</p>
          : data.transcripts.map((t) => (
            <div key={t.id} style={{ borderTop: "1px solid #f1f5f9", padding: "8px 0" }}>
              <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)}
                style={{ background: "#0b1f3a", color: "#fff", border: 0, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                {new Date(t.startedAt).toLocaleString("en-AU")} ({t.messages.length} messages)
              </button>
              {open === t.id && t.messages.map((m, i) => (
                <p key={i} style={{ margin: "6px 0", whiteSpace: "pre-wrap", fontSize: 14 }}>
                  <strong>{m.role === "user" ? "Visitor" : "Bot"}:</strong> {m.content}
                </p>
              ))}
            </div>
          ))}
      </div>
    </>
  );
}
