"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import OnOff from "../ui/OnOff";
import ChatbotEditor, { type EditorRow } from "./ChatbotEditor";
import { matchesSite } from "../../../lib/chatbot/search";
import { combinedCopyNote } from "../../../lib/chatbot/combined-note";
import { chatbotEditorPath, chatbotPagePath } from "../../../lib/chatbot/paths";

type Folded = { id: string; slug: string; name: string };
type Row = EditorRow & {
  id?: string; slug: string; name: string; domains: string[]; folded?: Folded[]; engine: "platform" | "bespoke"; enabled: boolean | null; plan: string; canRemovePoweredBy: boolean;
  usage: { conversations: number; messages: number };
  cap: { state: "ok" | "near" | "over"; cap: number; pct: number };
  lastChange: { by?: string; at?: string; reason?: string };
};
type Plan = { key: string; label: string; cap: number };

const css = `
.cb{max-width:1280px}
.cb h1{margin:0 0 4px}
.cb-tools{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:12px 0}
.cb-search{flex:1;min-width:220px;max-width:380px;height:36px;padding:0 12px;border:1px solid var(--n-200);border-radius:10px;font:400 13.5px Inter,system-ui,sans-serif;background:#fff;color:var(--n-900)}
.cb-count{font-size:12.5px;color:var(--n-500)}
.cb-row{background:#fff;border:1px solid #e6e6ef;border-radius:10px;padding:12px 16px;margin:0 0 8px;box-shadow:0 1px 2px rgba(11,9,46,.05);display:grid;grid-template-columns:1fr auto;gap:6px 16px;align-items:start}
.cb-row.bespoke{background:#faf9fd;box-shadow:none}
.cb-name{font-size:13px;color:var(--n-900)}.cb-name b{font-weight:600}.cb-slug{color:var(--n-500)}
.cb-open{color:inherit;text-decoration:none}.cb-open:hover{text-decoration:underline}
.cb-actions{display:flex;gap:8px;justify-content:flex-end}
.cb-last{font-size:12px;color:var(--n-500);margin-top:2px}
.cb-meta{grid-column:1/-1;display:flex;gap:6px 24px;flex-wrap:wrap;font-size:12px;color:var(--n-900);align-items:center}
.cb-meta select{font:400 12px Inter,system-ui,sans-serif;border:1px solid var(--n-200);border-radius:6px;background:#fff;padding:2px 4px}
.cb-muted{color:var(--n-500)}
.cb-flag{font-weight:600}.cb-flag.near{color:#8a5a00}.cb-flag.over{color:#b42318}
.cb-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-height:24px}
.cb-bespoke{font-size:12px;color:var(--n-500);text-align:right;max-width:300px}
.cb-alert{background:#fff;border:1px solid #f6c4bf;color:#b42318;border-radius:10px;padding:12px 16px;margin:8px 0;font-size:13px}
@media (max-width:720px){
  .cb-row{grid-template-columns:1fr}
  .cb-right,.cb-actions{justify-content:flex-start;align-items:flex-start}
  .cb-right{order:2;margin:4px 0 6px}
  .cb-meta{order:3}
  .cb-bespoke{text-align:left;max-width:none}
  .cb-right .onoff-wrap{flex-direction:row-reverse;justify-content:flex-end}
}
`;

export default function ChatbotsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [kill, setKill] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/chatbots");
    if (r.ok) { const j = await r.json(); setRows(j.rows); setPlans(j.plans); setKill(j.kill); }
    setLoaded(true);
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

  const shown = useMemo(() => rows.filter((r) => matchesSite(q, { ...r, aliases: (r.folded ?? []).flatMap((f) => [f.name, f.slug]) })), [rows, q]);
  const when = (iso?: string) => (iso ? new Date(Date.parse(iso) + 10 * 3600_000).toISOString().slice(0, 16).replace("T", " ") + " Brisbane" : "");
  const note = (r: Row) => (r.enabled ? (r.cap.state === "near" ? `Near cap: ${r.usage.conversations} of ${r.cap.cap}` : r.cap.state === "over" ? `Over cap: ${r.usage.conversations} of ${r.cap.cap}` : "Answering visitors") : "Showing the break message");

  return (
    <div className="cb">
      <style>{css}</style>
      <h1>Chatbots</h1>
      <p style={{ color: "var(--n-500)", margin: "0 0 4px", maxWidth: 620 }}>One switch per site. When a bot is OFF, visitors get a polite message and no AI is used, so it costs nothing and does not count towards the monthly limit.</p>
      <div className="cb-tools">
        <input className="cb-search" type="search" data-testid="chatbots-search" aria-label="Search sites by name, slug or domain" placeholder="Search by name, slug or domain" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="cb-count" data-testid="chatbots-count" aria-live="polite">{loaded ? (q ? `${shown.length} of ${rows.length} sites` : `${rows.length} sites`) : "Loading"}</span>
      </div>
      {kill && <div role="alert" className="cb-alert"><strong>Emergency switch is on (CHATBOTS_KILL).</strong> Every platform chatbot is off until it is removed in Vercel.</div>}
      {msg && <div role="alert" data-testid="chatbots-error" className="cb-alert">{msg}</div>}
      {loaded && shown.length === 0 && <div className="cb-row" data-testid="chatbots-empty"><span className="cb-muted">{rows.length ? "No sites match that search." : "No chatbots yet."}</span></div>}
      {shown.map((r) => {
        const bespoke = r.engine === "bespoke" || r.enabled === null;
        const combined = combinedCopyNote(r.slug, r.folded ?? []);
        return (
          <div key={r.id || r.slug} className={`cb-row${bespoke ? " bespoke" : ""}`} data-testid={`row-${r.slug}`}>
            <div>
              <div className="cb-name"><Link href={chatbotPagePath(r.slug)} className="cb-open" data-testid={`open-${r.slug}`}><b>{r.name}</b></Link> <span className="cb-slug">({r.slug})</span></div>
              <div className="cb-last">{r.lastChange.at ? <>Last changed {when(r.lastChange.at)} by {r.lastChange.by}{r.lastChange.reason ? `. Reason: ${r.lastChange.reason}` : ""}</> : "No changes yet"}</div>
              {combined && <div className="cb-last" data-testid={`folded-${r.slug}`}>{combined}</div>}
            </div>
            <div className="cb-right">
              <div className="cb-actions">
                <Link href={chatbotPagePath(r.slug)} className="btn sm" data-testid={`view-${r.slug}`}>View</Link>
                <Link href={chatbotEditorPath(r.slug)} className="btn sm" data-testid={`edit-${r.slug}`}>Edit</Link>
              </div>
              {bespoke ? (
                <span className="cb-bespoke" data-testid={`bespoke-${r.slug}`}>Uses its own chat route. Not switched here yet; moves to the platform in a later release.</span>
              ) : (
                <OnOff testId={`toggle-${r.slug}`} on={!!r.enabled} label={`${r.name} chatbot`} busy={busy === r.slug} disabled={kill} disabledReason="Emergency switch is on" note={note(r)}
                  confirmOff={{ title: `Turn off ${r.name}?`, body: "Visitors get the break message. No AI is used.", reasonField: true }}
                  onToggle={(reason) => void post(r.slug, { action: "set_enabled", enabled: !r.enabled, reason: reason ?? "" })} />
              )}
            </div>
            {bespoke && (r.folded?.length ?? 0) > 0 && (
              <div className="cb-meta">
                <span data-testid={`usage-${r.slug}`}>This month: <b>{r.usage.conversations}</b> conversations, {r.usage.messages} messages</span>
              </div>
            )}
            {!bespoke && (
              <div className="cb-meta">
                <label>Plan{" "}
                  <select data-testid={`plan-${r.slug}`} aria-label={`Plan for ${r.name}`} value={r.plan} disabled={busy === r.slug} onChange={(e) => void post(r.slug, { action: "set_plan", plan: e.target.value })}>
                    {plans.map((p) => <option key={p.key} value={p.key}>{`${p.label} (${p.cap} per month)`}</option>)}
                  </select>
                </label>
                <span data-testid={`usage-${r.slug}`}>This month: <b>{r.usage.conversations}</b> of {r.cap.cap} conversations ({r.cap.pct}%), {r.usage.messages} messages</span>
                {r.cap.state !== "ok" && <span className={`cb-flag ${r.cap.state}`}>{r.cap.state === "over" ? "Over the plan limit (not enforced yet)" : "Near the plan limit"}</span>}
                <span className="cb-muted">Powered by Saabai: {r.canRemovePoweredBy ? "can be removed" : "always shown"}</span>
                <button type="button" className="btn sm" data-testid={`customise-${r.slug}`} aria-expanded={editing === r.slug} onClick={() => setEditing(editing === r.slug ? null : r.slug)}>{editing === r.slug ? "Close editor" : "Customise"}</button>
              </div>
            )}
            {!bespoke && editing === r.slug && <div style={{ gridColumn: "1 / -1" }}><ChatbotEditor key={r.slug} row={r} onSaved={load} /></div>}
          </div>
        );
      })}
    </div>
  );
}
