"use client";
import { useCallback, useEffect, useState } from "react";
import OnOff from "../ui/OnOff";

type Row = {
  slug: string; name: string; engine: "platform" | "bespoke"; enabled: boolean | null; plan: string; canRemovePoweredBy: boolean;
  usage: { conversations: number; messages: number };
  cap: { state: "ok" | "near" | "over"; cap: number; pct: number };
  lastChange: { by?: string; at?: string; reason?: string };
};
type Plan = { key: string; label: string; cap: number };

const box = { background: "#fff", border: "1px solid var(--n-300)", borderRadius: 12, padding: 16, margin: "12px 0", color: "var(--n-900)" } as const;

export default function ChatbotsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [kill, setKill] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/chatbots");
    if (r.ok) { const j = await r.json(); setRows(j.rows); setPlans(j.plans); setKill(j.kill); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function post(slug: string, body: Record<string, unknown>) {
    setBusy(slug); setMsg("");
    const r = await fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || "Couldn't save.");
    await load();
    setBusy("");
  }

  function toggle(row: Row) {
    const turningOff = row.enabled === true;
    let reason = "";
    if (turningOff) {
      const ok = confirm(`Turn off the chatbot for ${row.name}? Visitors will see a polite "chat is taking a break" message and no AI is used.`);
      if (!ok) return;
      reason = prompt("Reason (optional, saved in the change log)") ?? "";
    }
    void post(row.slug, { action: "set_enabled", enabled: !row.enabled, reason });
  }

  const when = (iso?: string) => (iso ? new Date(Date.parse(iso) + 10 * 3600_000).toISOString().slice(0, 16).replace("T", " ") + " Brisbane" : "");

  return (
    <div style={{ maxWidth: 980 }}>
      <h1 style={{ margin: "0 0 4px" }}>Chatbots</h1>
      <p style={{ color: "var(--n-500)", margin: "0 0 12px" }}>One switch per site. When a bot is OFF, visitors get a polite message and no AI is used, so it costs nothing and does not count towards the monthly limit.</p>
      {kill && <div role="alert" style={{ ...box, borderColor: "var(--bad)", color: "var(--bad)" }}><strong>Emergency switch is on (CHATBOTS_KILL).</strong> Every platform chatbot is off until it is removed in Vercel.</div>}
      {msg && <div role="alert" data-testid="chatbots-error" style={{ ...box, borderColor: "var(--bad)", color: "var(--bad)" }}>{msg}</div>}
      {rows.length === 0 && <div style={box}>No chatbots yet.</div>}
      {rows.map((r) => (
        <div key={r.slug} style={box} data-testid={`row-${r.slug}`}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: 16 }}>{r.name}</strong> <span style={{ color: "var(--n-500)" }}>({r.slug})</span>
              <div style={{ fontSize: 12.5, color: "var(--n-500)", marginTop: 4 }}>
                {r.lastChange.at ? <>Last changed {when(r.lastChange.at)} by {r.lastChange.by}{r.lastChange.reason ? `. Reason: ${r.lastChange.reason}` : ""}</> : "No changes yet"}
              </div>
            </div>
            {r.engine === "platform" && r.enabled !== null ? (
              <OnOff testId={`toggle-${r.slug}`} on={r.enabled} label={`Chatbot for ${r.name}`} disabled={busy === r.slug || kill} onToggle={() => toggle(r)} note={r.enabled ? "Answering visitors" : "Showing the break message"} />
            ) : (
              <span data-testid={`bespoke-${r.slug}`} style={{ fontSize: 12.5, color: "var(--n-500)", maxWidth: 280 }}>Uses its own chat route. It is not switched here yet and moves to the platform in a later release.</span>
            )}
          </div>
          {r.engine === "platform" && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 12, fontSize: 13.5, alignItems: "center" }}>
            <label>Plan{" "}
              <select data-testid={`plan-${r.slug}`} value={r.plan} disabled={busy === r.slug} onChange={(e) => void post(r.slug, { action: "set_plan", plan: e.target.value })}>
                {plans.map((p) => <option key={p.key} value={p.key}>{p.label} ({p.cap}/month)</option>)}
              </select>
            </label>
            <span data-testid={`usage-${r.slug}`}>This month: <b>{r.usage.conversations}</b> of {r.cap.cap} conversations ({r.cap.pct}%), {r.usage.messages} messages</span>
            {r.cap.state !== "ok" && <span style={{ color: r.cap.state === "over" ? "var(--bad)" : "#92400e", fontWeight: 700 }}>{r.cap.state === "over" ? "Over the plan limit (not enforced yet)" : "Near the plan limit"}</span>}
            <span style={{ color: "var(--n-500)" }}>Powered by Saabai: {r.canRemovePoweredBy ? "can be removed" : "always shown"}</span>
          </div>
          )}
        </div>
      ))}
    </div>
  );
}
