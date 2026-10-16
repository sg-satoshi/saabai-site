"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { confirmDialog, notify } from "../ui/Feedback";
import "./experiments.css";

type Variant = { id: string; text: string; emphasis?: string; active: boolean };
type Exp = { id: string; name?: string; slot: string; path: string; status: string; defaultVariantId: string; variants: Variant[]; leadValueAUD?: number; rev?: number; updatedAt?: string };
type VR = { id: string; label?: string; impressions: number; ctaClicks: number; calls: number; enquiries: number; converters: number; rate: number; rateLow: number; rateHigh: number; probBest: number };
type Verdict = { kind: string; leaderId?: string; probBest: number; lift?: { median: number; low: number; high: number }; missing: string[]; headline: string; detail: string; canMakeWinner: boolean };
type Breakdown = { dim: string; rows: { bucket: string; views: number; ctaClicks: number; conversions: number; rate: number }[] };
type Detail = {
  experiment: Exp; analysis: { variants: VR[]; verdict: Verdict }; daysRunning: number;
  totals: { views: number; ctaClicks: number; calls: number; enquiries: number; conversions: number; rate: number };
  daily: { day: string; views: number; conversions: number }[]; breakdowns: Breakdown[]; dataAvailable: boolean;
  audit: { id: number; actor: string; action: string; detail: Record<string, unknown>; created_at: string }[];
};
type Item = { id: string; name: string; slot: string; status: string; variants: number; activeVariants: number; views: number; conversions: number; rate: number; daysRunning: number; verdict: { kind: string; headline: string } };

const pct = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const nf = (x: number) => x.toLocaleString("en-AU");
const tone = (s: string) => (s === "running" ? "ok" : s === "won" ? "info" : s === "paused" ? "warn" : "neutral");
const vtone = (k: string) => (k === "winner" ? "ok" : k === "leading" ? "info" : "neutral");
const DIMS: Record<string, string> = { channel: "Channel", utm_source: "Source", utm_campaign: "Campaign" };
const ACTION_WORDS: Record<string, string> = { update_variant: "Edited copy", add_variant: "Added variant", pause_variant: "Paused variant", resume_variant: "Resumed variant", pause_test: "Paused test", resume_test: "Resumed test", reopen_test: "Reopened test", make_winner: "Made winner live", set_lead_value: "Changed lead value" };

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

export default function ExperimentsClient() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const loadList = useCallback(async () => {
    try { setItems((await api("/api/admin/experiments")).items); setErr(""); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("id"); if (id) setOpenId(id); }, []);
  const open = (id: string | null) => { setOpenId(id); history.replaceState(null, "", id ? `?id=${id}` : window.location.pathname); if (!id) loadList(); };

  return (
    <div className="pg xp">
      {openId ? <DetailView id={openId} onBack={() => open(null)} /> : (
        <>
          <div className="ph"><div><h1>Experiments</h1><p className="sub">Split tests on saabai.ai. Pick a test to edit copy, see results and choose a winner.</p></div></div>
          {err && <div className="xp-err">{err}</div>}
          {!items && !err && <p className="muted">Loading…</p>}
          <div className="xp-list">
            {items?.map((i) => (
              <button key={i.id} className="xp-item" onClick={() => open(i.id)}>
                <div>
                  <div className="t">{i.name}</div>
                  <div className="s">{i.slot} · {i.activeVariants} of {i.variants} variants live · day {i.daysRunning}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Badge tone={tone(i.status)}>{i.status}</Badge><Badge tone={vtone(i.verdict.kind)}>{i.verdict.headline}</Badge></div>
                <div className="m"><span>Views <b>{nf(i.views)}</b></span><span>Conversions <b>{nf(i.conversions)}</b></span><span>Rate <b>{pct(i.rate)}</b></span></div>
              </button>
            ))}
            {items?.length === 0 && <p className="muted">No experiments yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function CopyView({ v }: { v: { text: string; emphasis?: string } }) {
  return <div className="xp-copy">{v.text} {v.emphasis && <span className="g">{v.emphasis}</span>}</div>;
}

function DetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dim, setDim] = useState("channel");
  const [lead, setLead] = useState("");

  const load = useCallback(async () => {
    try { const x = await api(`/api/admin/experiments/${id}`); setD(x); setLead(x.experiment.leadValueAUD != null ? String(x.experiment.leadValueAUD) : ""); setErr(""); } catch (e) { setErr((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(action: Record<string, unknown>, okMsg: string): Promise<boolean> {
    if (!d) return false;
    setBusy(true);
    try {
      const x = await api(`/api/admin/experiments/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, rev: d.experiment.rev ?? 0 }) });
      setD(x); setLead(x.experiment.leadValueAUD != null ? String(x.experiment.leadValueAUD) : ""); notify.success(okMsg); return true;
    } catch (e) { notify.error((e as Error).message); if (/changed this test/.test((e as Error).message)) load(); return false; }
    finally { setBusy(false); }
  }

  if (err) return <><button className="xp-back" onClick={onBack}>← All experiments</button><div className="xp-err">{err}</div></>;
  if (!d) return <p className="muted">Loading…</p>;
  const { experiment: e, analysis, totals, daysRunning } = d;
  const v = analysis.verdict;
  const byId = new Map(analysis.variants.map((x) => [x.id, x]));
  const maxDay = Math.max(1, ...d.daily.map((x) => x.views));
  const rules = [
    { l: "Confidence", val: pct(v.probBest, 0), ok: v.probBest >= 0.95, t: "95%" },
    { l: "Days of data", val: String(daysRunning), ok: daysRunning >= 14, t: "14" },
    { l: "Fewest views on a variant", val: nf(Math.min(...analysis.variants.map((x) => x.impressions), Infinity) === Infinity ? 0 : Math.min(...analysis.variants.map((x) => x.impressions))), ok: analysis.variants.length > 0 && analysis.variants.every((x) => x.impressions >= 300), t: "300" },
    { l: "Conversions", val: String(totals.conversions), ok: totals.conversions >= 10, t: "10" },
  ];
  const bd = d.breakdowns.find((b) => b.dim === dim);

  return (
    <>
      <button className="xp-back" onClick={onBack}>← All experiments</button>
      <div className="ph">
        <div><h1>{e.name ?? e.id}</h1><p className="sub">{e.slot} on {e.path} · changes go live within about a minute, no redeploy</p></div>
        <div className="xp-acts">
          <Badge tone={tone(e.status)}>{e.status}</Badge>
          {e.status === "running" && <Button size="sm" disabled={busy} onClick={() => act({ type: "set_status", status: "paused" }, "Test paused. Everyone sees the control.")}>Pause test</Button>}
          {e.status === "paused" && <Button size="sm" variant="acc" disabled={busy} onClick={() => act({ type: "set_status", status: "running" }, "Test resumed.")}>Resume test</Button>}
          {e.status === "won" && <Button size="sm" disabled={busy} onClick={() => act({ type: "set_status", status: "running" }, "Test reopened.")}>Reopen test</Button>}
        </div>
      </div>

      <Card className={`xp-verdict ${v.kind}`}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Badge tone={vtone(v.kind)}>{v.kind === "winner" ? "Winner" : v.kind === "leading" ? "Leading" : v.kind === "no_data" ? "No data" : "Too early"}</Badge></div>
        <div className="h">{v.headline}</div>
        <div className="sub" style={{ color: "var(--n-700)" }}>{v.detail}</div>
        <div className="xp-rules">{rules.map((r) => <div key={r.l} className={`xp-rule ${r.ok ? "ok" : ""}`}>{r.l}<b>{r.val} / {r.t}</b></div>)}</div>
        <div className="xp-note">A winner needs all four. Conversions are enquiries plus call taps, counted once per visitor. Small sites need weeks, so be patient.</div>
      </Card>

      <div className="xp-kpis">
        <div className="xp-kpi"><div className="l">Views</div><div className="v">{nf(totals.views)}</div></div>
        <div className="xp-kpi"><div className="l">CTA clicks</div><div className="v">{nf(totals.ctaClicks)}</div></div>
        <div className="xp-kpi"><div className="l">Call taps</div><div className="v">{nf(totals.calls)}</div></div>
        <div className="xp-kpi"><div className="l">Enquiries</div><div className="v">{nf(totals.enquiries)}</div></div>
        <div className="xp-kpi"><div className="l">Conversion</div><div className="v">{pct(totals.rate)}</div></div>
        <div className="xp-kpi"><div className="l">Day</div><div className="v">{daysRunning}</div></div>
      </div>
      {!d.dataAvailable && <div className="xp-err">Analytics database isn't reachable right now, so numbers show as zero.</div>}

      <div className="xp-vars">
        {e.variants.map((vr) => {
          const s = byId.get(vr.id);
          const isControl = vr.id === e.defaultVariantId;
          const leader = v.leaderId === vr.id && v.kind !== "no_data";
          return (
            <div key={vr.id} className={`xp-var ${leader ? "leader" : ""} ${vr.active ? "" : "off"}`}>
              <div className="xp-top">
                <div className="nm">Variant {vr.id.toUpperCase()} {isControl && <Badge tone="neutral">control</Badge>} {!vr.active && <Badge tone="warn">paused</Badge>} {leader && <Badge tone="info">leading</Badge>}</div>
                <div className="xp-acts">
                  <Button size="sm" disabled={busy} onClick={() => setEditing(editing === vr.id ? null : vr.id)}>{editing === vr.id ? "Close" : "Edit copy"}</Button>
                  {!isControl && <Button size="sm" disabled={busy} onClick={() => act({ type: "set_variant_active", variantId: vr.id, active: !vr.active }, vr.active ? `Variant ${vr.id.toUpperCase()} paused.` : `Variant ${vr.id.toUpperCase()} resumed.`)}>{vr.active ? "Pause" : "Resume"}</Button>}
                  {!(e.status === "won" && isControl) && <Button size="sm" variant="pri" disabled={busy} onClick={async () => {
                    const proven = v.canMakeWinner && v.leaderId === vr.id;
                    const ok = await confirmDialog(proven ? `Make variant ${vr.id.toUpperCase()} the live headline for everyone? The test will end.` : `Variant ${vr.id.toUpperCase()} is not a proven winner yet. Make it the live headline for everyone anyway? The test will end, and the call is logged as yours.`, { confirmLabel: "Make it live" });
                    if (ok) act({ type: "make_winner", variantId: vr.id }, `Variant ${vr.id.toUpperCase()} is now live for everyone.`);
                  }}>{isControl ? "Keep as live" : "Make winner live"}</Button>}
                </div>
              </div>
              <CopyView v={vr} />
              {s && (
                <>
                  <div className="xp-nums">
                    <div>Views<b>{nf(s.impressions)}</b></div><div>CTA clicks<b>{nf(s.ctaClicks)}</b></div><div>Calls<b>{nf(s.calls)}</b></div>
                    <div>Enquiries<b>{nf(s.enquiries)}</b></div><div>Conversion<b>{pct(s.rate)}</b><span className="xp-count">{pct(s.rateLow)} to {pct(s.rateHigh)}</span></div><div>Likely best<b>{pct(s.probBest, 0)}</b></div>
                  </div>
                  <div className="xp-bar" aria-hidden><i style={{ width: `${Math.round(s.probBest * 100)}%` }} /></div>
                </>
              )}
              {editing === vr.id && <EditForm key={vr.id} v={vr} hasData={(s?.impressions ?? 0) >= 50} busy={busy} onSave={async (text, emphasis) => { if (await act({ type: "update_variant", variantId: vr.id, text, emphasis }, "Copy saved. Live within about a minute.")) setEditing(null); }} />}
            </div>
          );
        })}
      </div>

      <div className="xp-card-gap">
        <Card>
          <CardHeader title="Add a variant" action={e.variants.length < 8 && !adding ? <Button size="sm" onClick={() => setAdding(true)}>+ Add</Button> : undefined} />
          <CardBody>
            {adding ? <EditForm v={{ text: "", emphasis: "" }} hasData={false} busy={busy} saveLabel="Add variant" onCancel={() => setAdding(false)} onSave={async (text, emphasis) => { if (await act({ type: "add_variant", text, emphasis }, "Variant added. It starts getting visitors within about a minute.")) setAdding(false); }} />
              : <p className="xp-note">{e.variants.length >= 8 ? "This test already has the maximum of 8 variants." : "New variants share traffic evenly with the others. Add one at a time and let it gather data."}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Where visitors came from" />
          <CardBody>
            <div className="xp-tabs">{Object.entries(DIMS).map(([k, l]) => <button key={k} className={dim === k ? "on" : ""} onClick={() => setDim(k)}>{l}</button>)}</div>
            {bd && bd.rows.length ? (
              <div className="tbl-scroll"><table><thead><tr><th>{DIMS[dim]}</th><th className="r">Views</th><th className="r">CTA clicks</th><th className="r">Conversions</th><th className="r">Rate</th></tr></thead>
                <tbody>{bd.rows.map((r) => <tr key={r.bucket}><td>{r.bucket}</td><td className="r num">{nf(r.views)}</td><td className="r num">{nf(r.ctaClicks)}</td><td className="r num">{nf(r.conversions)}</td><td className="r num">{pct(r.rate)}</td></tr>)}</tbody></table></div>
            ) : <p className="xp-note">No data yet. Visitors from Google Ads or Facebook show up here once the links carry utm_source and utm_campaign. Only a label is stored, never anything personal.</p>}
            <p className="xp-note" style={{ marginTop: 8 }}>Each visitor is counted under how they first arrived in this test. Sources recorded from 17 Oct 2026, earlier visits show as "not recorded".</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Last 30 days" />
          <CardBody>
            {d.daily.length ? <div className="xp-trend" role="img" aria-label="Daily views">{d.daily.map((x) => <div key={x.day} title={`${x.day}: ${x.views} views, ${x.conversions} conversions`} style={{ height: `${Math.max(4, (x.views / maxDay) * 100)}%` }}><i style={{ height: `${x.views ? Math.min(100, (x.conversions / x.views) * 100) : 0}%` }} /></div>)}</div> : <p className="xp-note">Nothing yet.</p>}
            <p className="xp-note" style={{ marginTop: 8 }}>Light bars are daily views, dark is the share that converted.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Lead value (for ROI)" />
          <CardBody>
            <form className="xp-form" style={{ borderTop: 0, paddingTop: 0 }} onSubmit={(ev) => { ev.preventDefault(); const n = lead.trim() === "" ? null : Number(lead); act({ type: "set_lead_value", leadValueAUD: n }, "Lead value saved."); }}>
              <label>What one enquiry is worth, in AUD (leave blank until there are real numbers)
                <input inputMode="decimal" value={lead} onChange={(x) => setLead(x.target.value)} placeholder="Not set" />
              </label>
              <div className="xp-acts"><Button variant="sec" disabled={busy} type="submit">Save</Button></div>
              {e.leadValueAUD != null && totals.views > 0 && <p className="xp-note">At ${e.leadValueAUD} per enquiry, this test has produced about ${nf(Math.round(totals.enquiries * e.leadValueAUD))} so far.</p>}
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Change history" />
          <CardBody>
            {d.audit.length ? <div className="xp-audit">{d.audit.map((a) => (
              <div key={a.id}><span><b>{ACTION_WORDS[a.action] ?? a.action}</b>{typeof a.detail?.variant === "string" ? ` (variant ${String(a.detail.variant).toUpperCase()})` : ""}</span><span className="muted">{new Date(a.created_at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></div>
            ))}</div> : <p className="xp-note">No dashboard changes yet.</p>}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function EditForm({ v, hasData, busy, onSave, onCancel, saveLabel = "Save copy" }: { v: { text: string; emphasis?: string }; hasData: boolean; busy: boolean; onSave: (text: string, emphasis: string) => void; onCancel?: () => void; saveLabel?: string }) {
  const [text, setText] = useState(v.text);
  const [emphasis, setEmphasis] = useState(v.emphasis ?? "");
  const bad = /[\u2013\u2014]/.test(text + emphasis) ? "Please avoid long dashes. Use a comma or full stop." : !text.trim() ? "" : text.length > 90 || emphasis.length > 90 ? "Keep each part under 90 characters." : "";
  return (
    <form className="xp-form" onSubmit={(ev) => { ev.preventDefault(); if (!bad && text.trim()) onSave(text, emphasis); }}>
      <label>Headline <span className="xp-count">{text.length}/90</span><input value={text} onChange={(x) => setText(x.target.value)} maxLength={120} required /></label>
      <label>Highlighted part, shown in the gradient (optional) <span className="xp-count">{emphasis.length}/90</span><input value={emphasis} onChange={(x) => setEmphasis(x.target.value)} maxLength={120} /></label>
      <div className="xp-prev"><CopyView v={{ text: text || "Your headline", emphasis }} /></div>
      {hasData && <p className="xp-note">This variant already has results. Changing the wording mixes old and new numbers, so adding a new variant is usually cleaner.</p>}
      {bad && <p className="xp-note" style={{ color: "var(--bad)" }}>{bad}</p>}
      <div className="xp-acts"><Button variant="acc" type="submit" disabled={busy || !!bad || !text.trim()}>{saveLabel}</Button>{onCancel && <Button variant="gh" onClick={onCancel}>Cancel</Button>}</div>
    </form>
  );
}
