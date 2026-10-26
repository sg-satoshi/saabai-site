"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OnOff from "../../ui/OnOff";
import ChatbotEditor, { type EditorRow } from "../ChatbotEditor";
import { combinedCopyNote } from "../../../../lib/chatbot/combined-note";
import { PLAN_LABEL, TONE_LABEL, type Plan, type Tone } from "../../../../lib/chatbot/core";
import { chatbotHistoryPath, chatbotPagePath, rowForSlug } from "../../../../lib/chatbot/paths";

type Folded = { id: string; slug: string; name: string };
type Row = EditorRow & {
  domains: string[];
  folded?: Folded[];
  engine: "platform" | "bespoke";
  enabled: boolean | null;
  canRemovePoweredBy: boolean;
  usage: { conversations: number; messages: number };
  cap: { state: "ok" | "near" | "over"; cap: number; pct: number };
  lastChange: { by?: string; at?: string; reason?: string };
};
type PlanOption = { key: string; label: string; cap: number };

const css = `
.bd{max-width:1100px}
.bd h1{margin:8px 0 4px}
.bd h2{margin:0 0 8px;font:600 15px Inter,system-ui,sans-serif}
.bd-back{font-size:13px;color:var(--n-700)}
.bd-links{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.bd-slug{color:var(--n-500);font-size:13px}
.bd-note{font-size:13px;color:var(--n-700);margin:6px 0}
.bd-card{background:#fff;border:1px solid #e6e6ef;border-radius:10px;padding:14px 16px;margin:0 0 12px}
.bd-grid{display:grid;grid-template-columns:180px 1fr;gap:8px 16px;font-size:13px}
.bd-grid dt{color:var(--n-500)}
.bd-grid dd{margin:0;color:var(--n-900)}
.bd-facts{white-space:pre-wrap;max-height:180px;overflow:auto;margin:0}
.bd-plan{display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:13px}
.bd-plan select{font:400 13px Inter,system-ui,sans-serif;border:1px solid var(--n-200);border-radius:6px;background:#fff;padding:4px 6px}
.bd-alert{background:#fff;border:1px solid #f6c4bf;color:#b42318;border-radius:10px;padding:12px 16px;margin:8px 0;font-size:13px}
.bd-flag{font-weight:600}.bd-flag.near{color:#8a5a00}.bd-flag.over{color:#b42318}
#plan,#editor{scroll-margin-top:80px}
@media (max-width:720px){.bd-grid{grid-template-columns:1fr}.bd-grid dt{margin-top:6px}}
`;

function brisbane(iso?: string) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t + 10 * 3600_000).toISOString().slice(0, 16).replace("T", " ") + " Brisbane";
}

export default function BotDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [kill, setKill] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/chatbots");
    if (!r.ok) { setFailed(true); setLoaded(true); return; }
    const j = await r.json();
    setRows(j.rows ?? []);
    setPlans(j.plans ?? []);
    setKill(!!j.kill);
    setFailed(false);
    setLoaded(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const row = rowForSlug(rows, slug);

  useEffect(() => {
    if (!row) return;
    let current = slug;
    try { current = decodeURIComponent(slug); } catch { /* keep the raw slug */ }
    if (row.slug === current.trim()) return;
    const hash = window.location.hash === "#editor" || window.location.hash === "#plan" ? window.location.hash : "";
    router.replace(chatbotPagePath(row.slug) + hash);
  }, [row, slug, router]);

  useEffect(() => {
    if (!row) return;
    const id = window.location.hash.slice(1);
    if (id !== "editor" && id !== "plan") return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [row]);

  async function post(body: Record<string, unknown>) {
    if (!row) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || "Couldn't save.");
    await load();
    setBusy(false);
  }

  const bespoke = !!row && (row.engine === "bespoke" || row.enabled === null);
  const planLabel = row ? (PLAN_LABEL[row.plan as Plan] ?? row.plan) : "";
  const toneLabel = row ? (TONE_LABEL[row.tone as Tone] ?? row.tone) : "";
  const combined = row ? combinedCopyNote(row.slug, row.folded ?? []) : "";
  const note = row && row.enabled
    ? (row.cap.state === "near" ? `Near cap: ${row.usage.conversations} of ${row.cap.cap}` : row.cap.state === "over" ? `Over cap: ${row.usage.conversations} of ${row.cap.cap}` : "Answering visitors")
    : "Showing the break message";

  return (
    <div className="bd">
      <style>{css}</style>
      <Link href="/saabai-admin/chatbots" className="bd-back">All chatbots</Link>
      {!loaded && <p>Loading</p>}
      {loaded && failed && <p role="alert" className="bd-alert">Could not load this chatbot.</p>}
      {loaded && !failed && !row && <p data-testid="bot-missing">No chatbot matches that address.</p>}
      {row && (
        <>
          <h1 data-testid="bot-title">{row.name}</h1>
          <div className="bd-slug">{row.slug}</div>
          {combined && <p className="bd-note" data-testid="bot-folded">{combined}</p>}
          <div className="bd-links">
            <a href="#plan" className="btn sm" data-testid="link-plan">Plan</a>
            <a href="#editor" className="btn sm" data-testid="link-editor">Editor</a>
            <Link href={chatbotHistoryPath(row.slug)} className="btn sm" data-testid="link-history">Chat history</Link>
          </div>
          {kill && <div role="alert" className="bd-alert"><strong>Emergency switch is on (CHATBOTS_KILL).</strong> Every platform chatbot is off until it is removed in Vercel.</div>}
          {msg && <div role="alert" className="bd-alert">{msg}</div>}

          <section className="bd-card" data-testid="bot-settings">
            <h2>Settings</h2>
            <dl className="bd-grid">
              <dt>Name</dt><dd>{row.name}</dd>
              <dt>Slug</dt><dd>{row.slug}</dd>
              <dt>Domains</dt><dd>{row.domains.length ? row.domains.join(", ") : "No domain on file"}</dd>
              <dt>Engine</dt><dd>{bespoke ? "Own chat route" : "Platform chatbot"}</dd>
              <dt>Status</dt><dd>{bespoke ? "Own chat route" : row.enabled ? "On" : "Off"}</dd>
              <dt>Plan</dt><dd>{planLabel}</dd>
              <dt>This month</dt><dd>{row.usage.conversations} conversations, {row.usage.messages} messages{bespoke ? "" : ` (${row.cap.pct}% of ${row.cap.cap})`}</dd>
              <dt>Tone</dt><dd>{toneLabel}</dd>
              <dt>Facts</dt><dd>{row.knowledge.facts.trim() ? <p className="bd-facts">{row.knowledge.facts}</p> : "No facts saved yet."}</dd>
              <dt>Approved answers</dt><dd>{row.knowledge.faqs.length} {row.knowledge.faqs.length === 1 ? "question" : "questions"}</dd>
              <dt>Powered by Saabai</dt><dd>{row.canRemovePoweredBy ? "Can be removed" : "Always shown"}</dd>
              <dt>Last change</dt><dd>{row.lastChange.at ? `${brisbane(row.lastChange.at)} by ${row.lastChange.by || "unknown"}${row.lastChange.reason ? `. Reason: ${row.lastChange.reason}` : ""}` : "No changes yet"}</dd>
            </dl>
          </section>

          <section id="plan" className="bd-card" data-testid="bot-plan">
            <h2>Plan</h2>
            {bespoke ? (
              <p className="bd-note">This bot uses its own chat route. The platform editor and plan switch do not change it. Current plan on file: {planLabel}.</p>
            ) : (
              <div className="bd-plan">
                <label>Plan{" "}
                  <select data-testid={`plan-${row.slug}`} aria-label={`Plan for ${row.name}`} value={row.plan} disabled={busy} onChange={(e) => void post({ action: "set_plan", plan: e.target.value })}>
                    {plans.map((p) => <option key={p.key} value={p.key}>{`${p.label} (${p.cap} per month)`}</option>)}
                  </select>
                </label>
                <OnOff testId={`toggle-${row.slug}`} on={!!row.enabled} label={`${row.name} chatbot`} busy={busy} disabled={kill} disabledReason="Emergency switch is on" note={note}
                  confirmOff={{ title: `Turn off ${row.name}?`, body: "Visitors get the break message. No AI is used.", reasonField: true }}
                  onToggle={(reason) => void post({ action: "set_enabled", enabled: !row.enabled, reason: reason ?? "" })} />
                {row.cap.state !== "ok" && <span className={`bd-flag ${row.cap.state}`}>{row.cap.state === "over" ? "Over the plan limit (not enforced yet)" : "Near the plan limit"}</span>}
              </div>
            )}
          </section>

          <section id="editor" data-testid="bot-editor">
            <div className="bd-card">
              <h2>Editor</h2>
              {bespoke ? (
                <p className="bd-note">This bot uses its own chat route. The platform editor and plan switch do not change it.</p>
              ) : (
                <ChatbotEditor key={row.slug} row={row} onSaved={load} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
