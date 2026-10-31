"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import OnOff from "../../ui/OnOff";
import { Button } from "../../ui/Button";
import ChatbotEditor, { type EditorRow } from "../ChatbotEditor";
import { PLAN_LABEL, type Plan } from "../../../../lib/chatbot/core";
import { chatbotHistoryPath, rowForSlug } from "../../../../lib/chatbot/paths";
import { installSnippet } from "../../../../lib/chatbot/seed-shared";
import "../chatbots.css";

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
  botLock?: { locked: boolean; by?: string; at?: string };
};
type PlanOption = { key: string; label: string; cap: number };

function LockIcon({ open }: { open?: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  );
}

export default function BotDetailClient({ slug }: { slug: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [kill, setKill] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState("");
  const [canLock, setCanLock] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/chatbots");
    if (!r.ok) { setFailed(true); setLoaded(true); return; }
    const j = await r.json();
    setRows(j.rows ?? []);
    setPlans(j.plans ?? []);
    setKill(!!j.kill);
    setCanLock(!!j.canLock);
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
    const url = new URL(window.location.href);
    url.pathname = `/saabai-admin/chatbots/${encodeURIComponent(row.slug)}`;
    window.history.replaceState(null, "", url.toString());
  }, [row, slug]);

  async function post(body: Record<string, unknown>) {
    if (!row) return;
    setMsg("");
    const r = await fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || "Couldn't save.");
    await load();
  }

  if (!loaded) return <p className="cbed-meta">Loading chatbot…</p>;
  if (failed) return <p role="alert">{"Couldn't load chatbots."}</p>;
  if (!row) return <p role="alert">No chatbot matches this address. <Link href="/saabai-admin/chatbots">All chatbots</Link></p>;

  const bespoke = row.engine === "bespoke" || row.enabled === null;
  const locked = !!row.botLock?.locked;
  const domain = row.domains?.[0];
  const siteHref = domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : "";

  return (
    <div className="cbed-bleed">
      <div id="editor" hidden />
      <div id="plan" hidden />
      <header className="cbed-head">
        <Link href="/saabai-admin/chatbots" className="back">All chatbots</Link>
        {kill && <div role="alert" style={{ marginTop: 8 }}><strong>Emergency switch is on (CHATBOTS_KILL).</strong> Every platform chatbot is off until it is removed in Vercel.</div>}
        {msg && <p role="alert" style={{ color: "var(--bad)" }}>{msg}</p>}
        <div className="ehrow">
          <div>
            <div className="ttl">
              <h1>{row.name}</h1>
              {!bespoke && (
                <OnOff testId="detail-toggle" on={!!row.enabled} label={`${row.name} chatbot`} disabled={kill} disabledReason="Emergency switch is on"
                  confirmOff={{ title: `Turn off ${row.name}?`, body: "Visitors get the break message. No AI is used. You can turn them back on at any time.", reasonField: true }}
                  onToggle={(reason) => void post({ action: "set_enabled", enabled: !row.enabled, reason: reason ?? "" })} />
              )}
              {bespoke && <span className="own">Own route</span>}
              <span className="tag">{PLAN_LABEL[row.plan as Plan] ?? row.plan}</span>
              {locked && <span className="tag lock"><LockIcon /> Locked for client</span>}
            </div>
            <p className="meta">
              Bot: {row.resolved?.botName || row.name}
              <span className="sep" />
              <span className="num">{row.slug}</span>
              {domain && <><span className="sep" />{domain}</>}
              {row.usage && <><span className="sep" /><span className="num">{row.usage.conversations}</span> of <span className="num">{row.cap?.cap ?? 0}</span> chats this month</>}
            </p>
          </div>
          <div className="acts">
            {canLock && !bespoke && (
              <Button variant="sec" className={locked ? "pressed" : ""} aria-pressed={locked} aria-label={locked ? "Unlock this bot" : "Lock this bot for the client"} onClick={() => { if (locked) void post({ action: "set_lock", locked: false }); else setLockOpen((v) => !v); }}>
                <LockIcon open={!locked} /> {locked ? "Locked" : "Lock this bot"}
              </Button>
            )}
            <Link href={chatbotHistoryPath(row.slug)} className="btn sec" data-testid="link-history">Chat history</Link>
            {siteHref && <a className="btn sec" href={siteHref} target="_blank" rel="noreferrer">Open site</a>}
            <Button variant="gh" icon aria-label="More actions" onClick={() => setMore((v) => !v)}>···</Button>
            {more && (
              <div className="menu" role="menu">
                <button type="button" className="mi" onClick={() => { void navigator.clipboard?.writeText(installSnippet(row.slug)); setCopied(true); setMore(false); }}>{copied ? "Copied" : "Copy install line"}</button>
                {!bespoke && <button type="button" className="mi" onClick={() => { void post({ action: "set_enabled", enabled: !row.enabled, reason: "" }); setMore(false); }}>{row.enabled ? "Turn off" : "Turn on"}</button>}
              </div>
            )}
          </div>
        </div>
        {canLock && lockOpen && !locked && (
          <div className="cbed-lockpop" role="dialog" aria-label="Lock this bot for the client?">
            <LockIcon />
            <div>
              <h6>Lock this bot for the client?</h6>
              <p>The client can view it but can&apos;t change any settings. You and the Saabai team can still edit everything here, and unlock it at any time. Saved in the change log.</p>
            </div>
            <div className="bt">
              <Button variant="sec" size="sm" onClick={() => setLockOpen(false)}>Cancel</Button>
              <Button variant="pri" size="sm" onClick={() => { setLockOpen(false); void post({ action: "set_lock", locked: true }); }}>Lock this bot</Button>
            </div>
          </div>
        )}
      </header>
      {bespoke ? <p className="cbed-meta" style={{ padding: 32 }}>This site uses its own chat route. Settings here are not applied yet.</p> : (
        <ChatbotEditor row={row} plans={plans} kill={kill} onSaved={load} />
      )}
    </div>
  );
}
