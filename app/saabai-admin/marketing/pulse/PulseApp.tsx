"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card, CardBody, CardHeader } from "../../ui/Card";
import { confirmDialog, notify } from "../../ui/Feedback";
import {
  PLATFORMS, PULSE_SECTIONS, SAABAI_PRESET, limitFor, sectionItems, splitSections,
  type PulseBrief, type PulseCampaign, type PulseSection,
} from "@/lib/pulse/types";
import "./pulse.css";

const GOALS = ["Leads", "Sales", "Awareness", "Bookings", "Traffic"];
const TONES = ["Confident", "Friendly", "Premium", "Playful", "Direct"];
const EMPTY: PulseBrief = { preset: "saabai", ...SAABAI_PRESET, goal: "Leads", tone: "Confident", platforms: ["Meta", "Google"], budget: "", competitor: "" };

type View = { kind: "list" } | { kind: "brief" } | { kind: "campaign"; id: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (res.status === 401) throw new Error("Your session expired. Sign in again.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

async function stream(brief: PulseBrief, section: PulseSection | undefined, onText: (t: string) => void): Promise<string> {
  const res = await fetch("/api/pulse-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief, section }) });
  if (res.status === 401) throw new Error("Your session expired. Sign in again.");
  if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || "Generation failed");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  let last = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    if (Date.now() - last > 120) { onText(text); last = Date.now(); } // throttle re-renders on mobile
  }
  onText(text);
  return text;
}

export default function PulseApp() {
  const [campaigns, setCampaigns] = useState<PulseCampaign[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [view, setView] = useState<View>({ kind: "list" });
  const [brief, setBrief] = useState<PulseBrief>(EMPTY);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [sendOpen, setSendOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadErr("");
    try { setCampaigns((await api<{ campaigns: PulseCampaign[] }>("/api/admin/pulse/campaigns")).campaigns); }
    catch (e) { setLoadErr((e as Error).message); setCampaigns([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = view.kind === "campaign" ? campaigns?.find((c) => c.id === view.id) : undefined;
  const update = (c: PulseCampaign) => setCampaigns((cs) => (cs ? [c, ...cs.filter((x) => x.id !== c.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [c]));

  async function save(c: PulseCampaign, patch: Partial<PulseCampaign>) {
    try { update((await api<{ campaign: PulseCampaign }>(`/api/admin/pulse/campaigns/${c.id}`, { method: "PATCH", body: JSON.stringify(patch) })).campaign); }
    catch (e) { notify.error((e as Error).message); }
  }

  async function generate() {
    try {
      const { campaign } = await api<{ campaign: PulseCampaign }>("/api/admin/pulse/campaigns", { method: "POST", body: JSON.stringify({ brief }) });
      update(campaign);
      setView({ kind: "campaign", id: campaign.id });
      setBusy({ all: true });
      setFailed({});
      let sections: PulseCampaign["sections"] = {};
      try {
        const text = await stream(brief, undefined, (t) => { sections = splitSections(t); update({ ...campaign, sections, status: "generating" }); });
        sections = splitSections(text);
        await save(campaign, { sections, status: "ready" });
      } catch (e) {
        // keep whatever arrived; failed sections can be retried one at a time
        const msg = (e as Error).message;
        const missing = PULSE_SECTIONS.filter((s) => !sections[s] && (s !== "Competitor Positioning" || brief.competitor));
        setFailed(Object.fromEntries(missing.map((s) => [s, msg])));
        await save(campaign, { sections, status: Object.keys(sections).length ? "ready" : "error" });
        notify.error(msg);
      }
    } catch (e) { notify.error((e as Error).message); }
    finally { setBusy({}); }
  }

  async function regenerate(c: PulseCampaign, s: PulseSection) {
    setBusy((b) => ({ ...b, [s]: true }));
    setFailed((f) => { const n = { ...f }; delete n[s]; return n; });
    try {
      const text = await stream(c.brief, s, (t) => {
        const body = splitSections(t)[s] ?? t.replace(/^##.*\n/, "");
        update({ ...c, sections: { ...c.sections, [s]: body } });
      });
      const body = splitSections(text)[s] ?? text.replace(/^##.*\n/, "").trim();
      await save(c, { sections: { ...c.sections, [s]: body } });
    } catch (e) {
      setFailed((f) => ({ ...f, [s]: (e as Error).message }));
    } finally { setBusy((b) => ({ ...b, [s]: false })); }
  }

  async function remove(c: PulseCampaign) {
    if (!(await confirmDialog(`Delete "${c.title}"? This can't be undone.`, { confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/admin/pulse/campaigns/${c.id}`, { method: "DELETE" });
      setCampaigns((cs) => cs?.filter((x) => x.id !== c.id) ?? null);
      if (view.kind === "campaign" && view.id === c.id) setView({ kind: "list" });
      notify.success("Campaign deleted");
    } catch (e) { notify.error((e as Error).message); }
  }

  return (
    <div className="pg pulse">
      <div className="ph">
        <div>
          <div className="crumb">Marketing / <b>Pulse</b></div>
          <h1>{view.kind === "campaign" && current ? current.title : view.kind === "brief" ? "New campaign" : "Pulse"}</h1>
          <p className="sub">
            {view.kind === "campaign" && current
              ? `${current.brief.platforms.join(", ")} · ${current.status === "generating" || busy.all ? "generating" : "saved"}`
              : "Ad copy for Saabai and client campaigns. Results save automatically."}
          </p>
        </div>
        <div className="pu-actions">
          {view.kind !== "list" && <Button onClick={() => setView({ kind: "list" })}>All campaigns</Button>}
          {view.kind === "campaign" && current && (
            <>
              <Button onClick={() => setSendOpen(true)} disabled={!Object.keys(current.sections).length}>Send to Marketing</Button>
              <Button variant="dg" onClick={() => remove(current)}>Delete</Button>
            </>
          )}
          {view.kind === "list" && <Button variant="pri" onClick={() => { setBrief(EMPTY); setView({ kind: "brief" }); }}>New campaign</Button>}
        </div>
      </div>

      {view.kind === "list" && <CampaignList campaigns={campaigns} err={loadErr} retry={load} open={(id) => setView({ kind: "campaign", id })} remove={remove} />}
      {view.kind === "brief" && <BriefForm brief={brief} setBrief={setBrief} submit={generate} busy={!!busy.all} />}
      {view.kind === "campaign" && current && (
        <Results c={current} busy={busy} failed={failed} regenerate={regenerate} save={save} />
      )}
      {view.kind === "campaign" && !current && campaigns && <Card><CardBody>That campaign was not found.</CardBody></Card>}
      {sendOpen && current && <SendSheet c={current} close={() => setSendOpen(false)} />}
    </div>
  );
}

function CampaignList({ campaigns, err, retry, open, remove }: { campaigns: PulseCampaign[] | null; err: string; retry: () => void; open: (id: string) => void; remove: (c: PulseCampaign) => void }) {
  if (!campaigns) return <Card><CardBody><div className="pu-skel" /><div className="pu-skel" /><div className="pu-skel short" /></CardBody></Card>;
  if (err) return <Card><CardBody><p className="pu-err">{err}</p><Button onClick={retry}>Try again</Button></CardBody></Card>;
  if (!campaigns.length) return <Card><CardBody><h2>No campaigns yet</h2><p className="muted">Start with the Saabai preset or describe a client offer.</p></CardBody></Card>;
  return (
    <Card>
      <CardHeader title={`Campaigns (${campaigns.length})`} />
      <ul className="pu-list">
        {campaigns.map((c) => (
          <li key={c.id}>
            <button className="pu-open" onClick={() => open(c.id)}>
              <b>{c.title}</b>
              <span className="muted">{c.brief.platforms.join(", ")} · {new Date(c.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" })}</span>
            </button>
            <Badge tone={c.status === "ready" ? "ok" : c.status === "error" ? "bad" : c.status === "generating" ? "info" : "neutral"}>{c.status}</Badge>
            <Button size="sm" variant="dg" aria-label={`Delete ${c.title}`} onClick={() => remove(c)}>Delete</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Chips({ options, value, onChange, multi }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <div className="pu-chips" role="group">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} className={on ? "on" : ""}
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o) : [...value, o]) : [o])}>{o}</button>
        );
      })}
    </div>
  );
}

function BriefForm({ brief, setBrief, submit, busy }: { brief: PulseBrief; setBrief: (b: PulseBrief) => void; submit: () => void; busy: boolean }) {
  const set = (k: keyof PulseBrief) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setBrief({ ...brief, [k]: e.target.value });
  const ok = brief.product.trim() && brief.audience.trim() && brief.goal && brief.platforms.length;
  return (
    <Card>
      <CardHeader title="Brief" />
      <CardBody>
        <form className="pu-form" onSubmit={(e) => { e.preventDefault(); if (ok && !busy) submit(); }}>
          <label>Preset
            <select value={brief.preset} onChange={(e) => setBrief(e.target.value === "saabai" ? { ...brief, preset: "saabai", ...SAABAI_PRESET } : { ...brief, preset: "custom", product: "", audience: "", message: "" })}>
              <option value="saabai">Saabai (Blueprint and care plans)</option>
              <option value="custom">Client or custom</option>
            </select>
          </label>
          <label>Product or service *<textarea rows={2} value={brief.product} onChange={set("product")} required maxLength={600} /></label>
          <label>Audience *<textarea rows={2} value={brief.audience} onChange={set("audience")} required maxLength={600} /></label>
          <label>Key message<textarea rows={2} value={brief.message} onChange={set("message")} maxLength={600} /></label>
          <div className="pu-field"><span>Goal *</span><Chips options={GOALS} value={[brief.goal]} onChange={(v) => setBrief({ ...brief, goal: v[0] })} /></div>
          <div className="pu-field"><span>Tone</span><Chips options={TONES} value={[brief.tone]} onChange={(v) => setBrief({ ...brief, tone: v[0] })} /></div>
          <div className="pu-field"><span>Platforms *</span><Chips multi options={PLATFORMS} value={brief.platforms} onChange={(v) => setBrief({ ...brief, platforms: v })} /></div>
          <div className="pu-2">
            <label>Budget<input value={brief.budget} onChange={set("budget")} maxLength={100} placeholder="e.g. $500 a month" /></label>
            <label>Competitor<input value={brief.competitor} onChange={set("competitor")} maxLength={200} /></label>
          </div>
          <div className="pu-submit">
            <Button variant="acc" type="submit" disabled={!ok || busy}>{busy ? "Generating..." : "Generate campaign"}</Button>
            <span className="muted">Uses the cheaper default model, about a cent a run.</span>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function Count({ n, max }: { n: number; max: number | null }) {
  if (!max) return <span className="pu-ct num">{n}</span>;
  return <span className={`pu-ct num ${n > max ? "over" : ""}`} title={n > max ? "Over the platform limit" : ""}>{n}/{max}</span>;
}

function Results({ c, busy, failed, regenerate, save }: {
  c: PulseCampaign; busy: Record<string, boolean>; failed: Record<string, string>;
  regenerate: (c: PulseCampaign, s: PulseSection) => void; save: (c: PulseCampaign, p: Partial<PulseCampaign>) => void;
}) {
  const shown = PULSE_SECTIONS.filter((s) => s !== "Competitor Positioning" || c.brief.competitor);
  return (
    <div className="pu-grid">
      {shown.map((s) => (
        <SectionCard key={s} c={c} s={s} busy={!!busy[s] || (!!busy.all && !c.sections[s])} error={failed[s]}
          regenerate={() => regenerate(c, s)} saveBody={(body) => save(c, { sections: { ...c.sections, [s]: body } })} />
      ))}
    </div>
  );
}

function SectionCard({ c, s, busy, error, regenerate, saveBody }: { c: PulseCampaign; s: PulseSection; busy: boolean; error?: string; regenerate: () => void; saveBody: (b: string) => void }) {
  const body = c.sections[s] ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const ref = useRef<HTMLTextAreaElement>(null);
  const kind = s === "Headlines" ? "headline" : s === "Primary Text" ? "primary" : s === "Call to Action" ? "cta" : null;
  const max = kind ? limitFor(kind, c.brief.platforms) : null;
  const items = useMemo(() => (kind ? sectionItems(body).map((t) => t.replace(/^(short|medium|long)\s*:\s*/i, "")) : []), [body, kind]);
  const over = max ? items.filter((t) => t.length > max).length : 0;

  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); notify.success("Copied"); } catch { notify.error("Couldn't copy"); }
  };

  return (
    <Card className={error ? "pu-failed" : ""}>
      <CardHeader
        title={<span>{s}{max ? <small className="muted"> · limit {max}</small> : null}</span>}
        action={
          <div className="pu-hd-act">
            {over > 0 && <Badge tone="warn">{over} over limit</Badge>}
            {busy ? <Badge tone="info">Writing</Badge> : <Button size="sm" onClick={regenerate}>{error ? "Retry" : "Regenerate"}</Button>}
          </div>
        }
      />
      <CardBody>
        {error && <p className="pu-err">{s} failed: {error.replace(/\.$/, "")}. Everything else is kept.</p>}
        {!body && busy && <><div className="pu-skel" /><div className="pu-skel" /><div className="pu-skel short" /></>}
        {!body && !busy && !error && <p className="muted">Nothing yet. Regenerate this section.</p>}
        {body && editing && (
          <div className="pu-edit">
            <textarea ref={ref} rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="pu-hd-act"><Button size="sm" variant="pri" onClick={() => { saveBody(draft); setEditing(false); }}>Save</Button><Button size="sm" variant="gh" onClick={() => setEditing(false)}>Cancel</Button></div>
          </div>
        )}
        {body && !editing && kind && items.length > 0 && (
          <ul className="pu-items">
            {items.map((t, i) => (
              <li key={i}><span>{t}</span><Count n={t.length} max={max} /><Button size="sm" variant="gh" aria-label="Copy" onClick={() => copy(t)}>Copy</Button></li>
            ))}
          </ul>
        )}
        {body && !editing && (!kind || items.length === 0) && <div className="pu-text">{body.replace(/\*\*/g, "")}</div>}
        {body && !editing && (
          <div className="pu-foot"><Button size="sm" variant="gh" onClick={() => copy(body.replace(/\*\*/g, ""))}>Copy all</Button><Button size="sm" variant="gh" onClick={() => { setDraft(body); setEditing(true); }}>Edit</Button></div>
        )}
      </CardBody>
    </Card>
  );
}

function SendSheet({ c, close }: { c: PulseCampaign; close: () => void }) {
  const head = sectionItems(c.sections.Headlines ?? "")[0] ?? c.title;
  const prim = sectionItems(c.sections["Primary Text"] ?? "");
  const cta = sectionItems(c.sections["Call to Action"] ?? "")[0] ?? "Find out more";
  const strip = (t?: string) => (t ?? "").replace(/^(short|medium|long)\s*:\s*/i, "");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState(head);
  const [body, setBody] = useState(`${strip(prim[2] ?? prim[1] ?? prim[0])}\n\n${cta}: https://saabai.ai/score`);
  const [saving, setSaving] = useState(false);
  const pick = (ch: "email" | "sms") => {
    setChannel(ch);
    setBody(ch === "sms" ? `Saabai: ${strip(prim[0])} ${cta}: saabai.ai/score Reply STOP to opt out` : `${strip(prim[2] ?? prim[1] ?? prim[0])}\n\n${cta}: https://saabai.ai/score`);
  };
  async function create() {
    setSaving(true);
    try {
      await api("/api/admin/marketing/drafts", { method: "POST", body: JSON.stringify({ channel, subject: channel === "email" ? subject : undefined, body, source: "pulse", sourceId: c.id }) });
      notify.success("Draft created in Marketing. Nothing was sent.");
      close();
    } catch (e) { notify.error((e as Error).message); } finally { setSaving(false); }
  }
  return (
    <div className="drawer-detail" role="dialog" aria-modal="true" aria-label="Send to Marketing" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="panel">
        <div className="card"><div className="hd"><h2>Send to Marketing</h2><Button size="sm" variant="gh" onClick={close}>Close</Button></div>
          <div className="bd pu-form">
            <p className="muted">This creates a draft only. Nothing is sent until you review it in Marketing. An unsubscribe link and STOP reply are added for marketing sends.</p>
            <div className="pu-field"><span>Channel</span><Chips options={["email", "sms"]} value={[channel]} onChange={(v) => pick(v[0] as "email" | "sms")} /></div>
            {channel === "email" && <label>Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} /></label>}
            <label>Message<textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} /></label>
            {channel === "sms" && <Count n={body.length} max={160} />}
            <Button variant="acc" onClick={create} disabled={saving || !body.trim()}>{saving ? "Creating..." : "Create draft"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
