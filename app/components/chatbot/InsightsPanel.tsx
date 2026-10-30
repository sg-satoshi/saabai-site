"use client";
import { useEffect, useState } from "react";

interface Step { key: string; label: string; count: number; rate: number | null; of: string }
interface Msg { role: "user" | "assistant"; content: string; at: string }
interface Transcript { id: string; startedAt: string; messages: Msg[] }
interface Data {
  funnel: { month: string; steps: Step[] };
  transcriptsEnabled: boolean; transcriptsAvailable: boolean; retentionDays: number;
  transcripts: Transcript[];
}

const portalCard: React.CSSProperties = {
  background: "var(--n-0)",
  border: "1px solid var(--n-200)",
  borderRadius: "var(--r-lg)",
  padding: 16,
  marginTop: 16,
};

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
  const selected = admin
    ? (open && data?.transcripts.some((t) => t.id === open) ? open : data?.transcripts[0]?.id ?? null)
    : open;
  if (err) return admin ? <div className="ch-card ch-card-bd" role="alert">{err}</div> : <div style={portalCard} role="alert">{err}</div>;
  if (!data) return admin ? <div className="ch-card ch-card-bd">Loading insights...</div> : <div style={portalCard}>Loading insights...</div>;
  if (!admin) return <PortalInsights data={data} open={open} setOpen={setOpen} />;
  const current = data.transcripts.find((t) => t.id === selected) ?? null;
  return (
    <div className="ch-insights" data-testid="chat-history-insights">
      <section className="ch-card" data-testid="insights-funnel">
        <div className="ch-card-bd">
          <h3 className="ch-h">Conversion funnel ({data.funnel.month})</h3>
          <p className="ch-note">Counts only. We never store what people type into form fields here.</p>
          <table className="ch-funnel">
            <tbody>
              {data.funnel.steps.map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td className="num r">{s.count}</td>
                  <td className="ch-rate">{s.rate === null ? "" : `${s.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ch-card" data-testid="insights-transcripts">
        <div className="ch-card-bd">
          <h3 className="ch-h">Transcripts (last {data.retentionDays} days)</h3>
          {!data.transcriptsEnabled ? <p className="ch-note">Transcripts are turned off for this chatbot.</p>
            : !data.transcriptsAvailable ? <p className="ch-note" data-testid="transcripts-unavailable">Transcripts aren&apos;t available right now.</p>
            : data.transcripts.length === 0 ? <p className="ch-note" data-testid="transcripts-empty">No chats yet.</p>
            : (
              <div className="ch-split">
                <div className="ch-list">
                  {data.transcripts.map((t) => (
                    <button key={t.id} type="button" aria-pressed={selected === t.id}
                      className={selected === t.id ? "btn pri sm" : "btn sm"}
                      onClick={() => setOpen(t.id)}>
                      {new Date(t.startedAt).toLocaleString("en-AU")} ({t.messages.length} messages)
                    </button>
                  ))}
                </div>
                <div className="ch-thread" data-testid="transcript-open">
                  {current ? current.messages.map((m, i) => (
                    <p key={i} className="ch-msg">
                      <strong>{m.role === "user" ? "Visitor" : "Bot"}:</strong> {m.content}
                    </p>
                  )) : <p className="ch-note">Choose a chat to read it.</p>}
                </div>
              </div>
            )}
        </div>
      </section>
    </div>
  );
}

function PortalInsights({ data, open, setOpen }: { data: Data; open: string | null; setOpen: (id: string | null) => void }) {
  return (
    <>
      <div style={portalCard} data-testid="insights-funnel">
        <h3 style={{ margin: "0 0 8px", color: "var(--navy-900)" }}>Conversion funnel ({data.funnel.month})</h3>
        <p style={{ margin: "0 0 12px", color: "var(--n-500)", fontSize: 13 }}>Counts only. We never store what people type into form fields here.</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {data.funnel.steps.map((s) => (
              <tr key={s.key} style={{ borderTop: "1px solid var(--n-100)" }}>
                <td style={{ padding: "8px 0" }}>{s.label}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }} className="num">{s.count}</td>
                <td style={{ textAlign: "right", color: "var(--n-500)", width: 90 }}>{s.rate === null ? "" : `${s.rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={portalCard} data-testid="insights-transcripts">
        <h3 style={{ margin: "0 0 8px", color: "var(--navy-900)" }}>Transcripts (last {data.retentionDays} days)</h3>
        {!data.transcriptsEnabled ? <p style={{ color: "var(--n-500)" }}>Transcripts are turned off for this chatbot.</p>
          : !data.transcriptsAvailable ? <p style={{ color: "var(--n-500)" }} data-testid="transcripts-unavailable">Transcripts aren&apos;t available right now.</p>
          : data.transcripts.length === 0 ? <p style={{ color: "var(--n-500)" }} data-testid="transcripts-empty">No chats yet.</p>
          : data.transcripts.map((t) => (
            <div key={t.id} style={{ borderTop: "1px solid var(--n-100)", padding: "10px 0" }}>
              <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)}
                style={{ background: "var(--navy-900)", color: "var(--n-0)", border: 0, borderRadius: "var(--r-md)", padding: "6px 12px", cursor: "pointer" }}>
                {new Date(t.startedAt).toLocaleString("en-AU")} ({t.messages.length} messages)
              </button>
              {open === t.id && t.messages.map((m, i) => (
                <p key={i} style={{ margin: "8px 0", whiteSpace: "pre-wrap", fontSize: 14, color: "var(--n-900)" }}>
                  <strong>{m.role === "user" ? "Visitor" : "Bot"}:</strong> {m.content}
                </p>
              ))}
            </div>
          ))}
      </div>
    </>
  );
}
