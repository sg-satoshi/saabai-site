"use client";
/** Client portal Upgrades: plan switcher and add-ons (mockups 60-66). */
import React, { useEffect, useState } from "react";
import "../../components/billing/billing.css";
import { aud, shortDate } from "../../components/billing/status";

type Plan = { id: string; name: string; blurb: string; priceCents: number; features: string[] };
type Addon = { id: string; name: string; description: string; billing: "one_off" | "monthly"; priceCents: number; fromPrice?: boolean; checkout: "stripe" | "quote" };
type SiteAddon = { addonId: string; status: "active" | "removing" | "pending"; endsAt?: string; billing: string };
type Data = {
  site: { id: string; name: string; domain: string | null } | null;
  gstRegistered: boolean;
  plans: Plan[];
  addons: Addon[];
  billing: { status: string; statusLabel: string; planId: string; planName: string; monthlyCents: number; currentPeriodEnd: string | null; pendingPlan: { planName: string; effectiveAt: string } | null; addons: SiteAddon[]; canManage: boolean } | null;
};
type Confirm =
  | { kind: "plan"; plan: Plan; quote: { kind: "upgrade" | "downgrade"; proratedCents: number; effectiveAt: string | null } }
  | { kind: "addon"; addon: Addon; quote: { proratedCents: number } }
  | { kind: "quote"; addon: Addon }
  | { kind: "quote-sent"; addon: Addon }
  | { kind: "remove"; addon: Addon }
  | null;

const ICON: Record<string, string> = { "extra-page": "▤", booking: "◷", "seo-pack": "⌕", "reviews-carousel": "☆", "custom-integration": "⌁" };

export function UpgradesPanel({ readOnly }: { readOnly?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"plan" | "addons">("plan");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");

  const load = () => fetch("/api/portal/billing").then((r) => r.json()).then(setData).catch(() => setErr("Couldn't load your plan"));
  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") === "1") setFlash("Payment received. Your add-on is switching on now.");
    if (q.get("addon")) setTab("addons");
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/portal/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong");
      return d;
    } catch (e) { setErr((e as Error).message); return null; } finally { setBusy(false); }
  }

  if (!data) return <div className="bl" style={{ padding: 8, color: "#5f6580" }}>{err || "Loading…"}</div>;
  const b = data.billing;
  const current = b?.monthlyCents ?? 0;
  const owned = (id: string) => b?.addons.find((a) => a.addonId === id && a.status !== "pending");
  const gstLine = data.gstRegistered ? "Prices exclude GST" : "GST not applicable";

  async function startPlan(plan: Plan) {
    const d = await post({ action: "change-plan", planId: plan.id });
    if (d?.quote) setConfirm({ kind: "plan", plan, quote: d.quote });
  }
  async function startAddon(addon: Addon) {
    if (addon.checkout === "quote") { setNotes(""); setConfirm({ kind: "quote", addon }); return; }
    const d = await post({ action: "add-addon", addonId: addon.id });
    if (d?.quote) setConfirm({ kind: "addon", addon, quote: d.quote });
  }
  async function confirmIt() {
    if (!confirm) return;
    if (confirm.kind === "plan") {
      const d = await post({ action: "change-plan", planId: confirm.plan.id, confirm: true });
      if (d?.ok) { setConfirm(null); setFlash(d.kind === "upgrade" ? `You're on ${confirm.plan.name} now.` : `Switching to ${confirm.plan.name} on ${shortDate(confirm.quote.effectiveAt)}.`); load(); }
    } else if (confirm.kind === "addon") {
      const d = await post({ action: "add-addon", addonId: confirm.addon.id, confirm: true });
      if (d?.url) { window.location.href = d.url; return; }
      if (d?.ok) { setConfirm(null); setFlash(`${confirm.addon.name} added. It's switching on now.`); load(); }
    } else if (confirm.kind === "quote") {
      const d = await post({ action: "quote", addonId: confirm.addon.id, notes });
      if (d?.ok) setConfirm({ kind: "quote-sent", addon: confirm.addon });
    } else if (confirm.kind === "remove") {
      const d = await post({ action: "remove-addon", addonId: confirm.addon.id });
      if (d?.ok) { setConfirm(null); setFlash(`${confirm.addon.name} stays on until ${shortDate(d.endsAt)}, then it's removed.`); load(); }
    }
  }
  async function manage() {
    const d = await post({ action: "manage" });
    if (d?.url) window.location.href = d.url;
  }

  return (
    <div className="bl">
      <div className="ph" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h1>Upgrades</h1>
          <div className="sub">{data.site?.domain || data.site?.name || "Your site"} · Change your plan or add extras. Billing is per site.</div>
        </div>
        {b?.canManage && <button className="bl-btn" onClick={manage} disabled={busy || readOnly}>Manage billing ↗</button>}
      </div>
      {readOnly && <div className="bl-banner">Viewing as client. Changes are disabled.</div>}
      {flash && <div className="bl-ok" style={{ marginBottom: 12 }}>{flash}</div>}
      {err && !confirm && <div className="bl-err" style={{ marginBottom: 12 }}>{err}</div>}
      {b && ["payment_failed", "past_due", "paused"].includes(b.status) && (
        <div className="bl-banner"><span>{b.statusLabel}. Update your card to keep things running.</span>{b.canManage && <button className="bl-btn sm" onClick={manage} disabled={readOnly}>Update card</button>}</div>
      )}

      <div className="bl-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "plan"} className={tab === "plan" ? "on" : ""} onClick={() => setTab("plan")}>Plan</button>
        <button role="tab" aria-selected={tab === "addons"} className={tab === "addons" ? "on" : ""} onClick={() => setTab("addons")}>Add-ons</button>
      </div>

      {tab === "plan" && (
        <>
          <div className="bl-cur">
            {b ? <span>Current plan <b>{b.planName} · <span className="num">{aud(b.monthlyCents).replace(".00", "")}/mo</span></b></span> : <span>No plan yet. Contact Saabai to get set up.</span>}
            {b?.currentPeriodEnd && <span>Renews <b className="num">{shortDate(b.currentPeriodEnd)}</b></span>}
            <span>{gstLine}</span>
          </div>
          {b?.pendingPlan && <div className="bl-banner">Switching to {b.pendingPlan.planName} on {shortDate(b.pendingPlan.effectiveAt)}.</div>}
          <div className="bl-plans">
            {data.plans.map((p) => {
              const isCur = b?.planId === p.id;
              const kind = p.priceCents > current ? "Upgrade" : "Downgrade";
              return (
                <div key={p.id} className={`bl-plan ${isCur ? "cur" : ""}`}>
                  <div className="bl-pt"><h4>{p.name}</h4>{isCur && <span className="bl-badge info">Current</span>}</div>
                  <div className="bl-pp">{aud(p.priceCents).replace(".00", "")}<small>/mo</small></div>
                  <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                  {isCur ? <button className="bl-btn" disabled>Your current plan</button>
                    : <button className={`bl-btn ${kind === "Upgrade" ? "pri" : ""}`} disabled={busy || readOnly || !b} onClick={() => startPlan(p)}>{kind} to {p.name}</button>}
                </div>
              );
            })}
          </div>
          <p className="bl-note">Upgrades apply now and you pay the difference for the rest of this cycle. Downgrades start on your next billing date. Cancel any time, your plan runs to the end of the cycle.</p>
        </>
      )}

      {tab === "addons" && (
        <>
          <p className="bl-note" style={{ marginTop: 0, marginBottom: 12 }}>Fixed price: checkout with Stripe. Custom work: we quote first. Monthly extras added mid-cycle are prorated.</p>
          <div className="bl-addons">
            {data.addons.map((a) => {
              const own = owned(a.id);
              return (
                <div key={a.id} className="bl-addon">
                  <div className="bl-pt">
                    <div style={{ display: "flex", gap: 10 }}>
                      <span aria-hidden style={{ width: 32, height: 32, borderRadius: 8, background: "#e8f7f9", color: "#0e7482", display: "grid", placeItems: "center", flexShrink: 0 }}>{ICON[a.id] || "+"}</span>
                      <div><h4>{a.name}</h4><p>{a.description}</p></div>
                    </div>
                    {own && <span className={`bl-badge ${own.status === "removing" ? "warn" : "ok"}`}>{own.status === "removing" ? `Ends ${shortDate(own.endsAt)}` : "Active"}</span>}
                  </div>
                  <div className="bl-af">
                    <div>
                      <div className="num" style={{ fontWeight: 600 }}>{a.fromPrice ? "From " : ""}{aud(a.priceCents).replace(".00", "")}<span style={{ fontFamily: "Inter,system-ui", fontWeight: 400, color: "#5f6580", fontSize: 12 }}>{a.billing === "monthly" ? " /mo" : " one-off"}</span></div>
                      <div style={{ fontSize: 12, color: "#5f6580" }}>{a.checkout === "stripe" ? "Checkout with Stripe" : "Quote via change request"}</div>
                    </div>
                    {own?.status === "active" && a.billing === "monthly" ? <button className="bl-btn sm" disabled={busy || readOnly} onClick={() => setConfirm({ kind: "remove", addon: a })}>Remove</button>
                      : own ? null
                      : a.checkout === "quote" ? <button className="bl-btn teal sm" disabled={busy || readOnly} onClick={() => startAddon(a)}>Request quote</button>
                      : <button className="bl-btn pri sm" disabled={busy || readOnly || !b} onClick={() => startAddon(a)}>Add</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirm && (
        <div className="bl-ov" onClick={() => !busy && setConfirm(null)}>
          <div className="bl-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="bl-mh">
              <h3>
                {confirm.kind === "plan" ? `${confirm.quote.kind === "upgrade" ? "Upgrade" : "Downgrade"} to ${confirm.plan.name}`
                  : confirm.kind === "addon" ? `Add ${confirm.addon.name}`
                  : confirm.kind === "quote" ? `Request a quote: ${confirm.addon.name}`
                  : confirm.kind === "quote-sent" ? "Quote request sent"
                  : `Remove ${confirm.addon.name}`}
              </h3>
              <button className="bl-x" aria-label="Close" onClick={() => setConfirm(null)}>×</button>
            </div>
            <div className="bl-mb">
              {confirm.kind === "plan" && (
                <div className="bl-sum">
                  <div className="r"><span>{confirm.plan.name}</span><span className="num">{aud(confirm.plan.priceCents)}/mo</span></div>
                  {confirm.quote.kind === "upgrade"
                    ? <><div className="r t"><span>Due today (prorated)</span><span className="num">{aud(confirm.quote.proratedCents)}</span></div><div className="ft">Starts now. Charged to your card on file. {gstLine}.</div></>
                    : <div className="ft">Starts on your next billing date{confirm.quote.effectiveAt ? `, ${shortDate(confirm.quote.effectiveAt)}` : ""}. You keep {b?.planName} until then. Nothing to pay today.</div>}
                </div>
              )}
              {confirm.kind === "addon" && (
                <div className="bl-sum">
                  <div className="r"><span>{confirm.addon.name}</span><span className="num">{aud(confirm.addon.priceCents)}{confirm.addon.billing === "monthly" ? "/mo" : ""}</span></div>
                  <div className="r t"><span>Due today{confirm.addon.billing === "monthly" ? " (prorated)" : ""}</span><span className="num">{aud(confirm.quote.proratedCents)}</span></div>
                  <div className="ft">{confirm.addon.billing === "monthly" ? "Added to your plan and charged to your card on file. Switches on straight away." : "You'll finish payment on Stripe's secure checkout."} {gstLine}.</div>
                </div>
              )}
              {confirm.kind === "quote" && (
                <>
                  <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "#5f6580" }}>Tell us what you&apos;re after and we&apos;ll come back with a fixed quote. No charge until you approve it.</p>
                  <textarea className="bl-in" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What do you need? Any deadlines?" aria-label="Notes" />
                </>
              )}
              {confirm.kind === "quote-sent" && (
                <div className="bl-done"><div className="ic">✓</div><div style={{ fontWeight: 600 }}>We&apos;re on it</div><div className="bl-help">You&apos;ll find it under Requests. We usually reply within one business day.</div></div>
              )}
              {confirm.kind === "remove" && <p style={{ margin: 0, fontSize: 14 }}>{confirm.addon.name} stays on until the end of this billing cycle{b?.currentPeriodEnd ? ` (${shortDate(b.currentPeriodEnd)})` : ""}, then it&apos;s removed. No more charges after that.</p>}
              {err && <div className="bl-err">{err}</div>}
            </div>
            <div className="bl-mf">
              {confirm.kind === "quote-sent" ? <button className="bl-btn pri" onClick={() => setConfirm(null)}>Done</button> : (
                <>
                  <button className="bl-btn" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
                  <button className="bl-btn pri" onClick={confirmIt} disabled={busy}>
                    {busy ? "Working…" : confirm.kind === "plan" ? (confirm.quote.kind === "upgrade" ? `Upgrade and pay ${aud(confirm.quote.proratedCents)}` : "Confirm downgrade")
                      : confirm.kind === "addon" ? (confirm.addon.billing === "monthly" ? `Add and pay ${aud(confirm.quote.proratedCents)}` : "Continue to checkout")
                      : confirm.kind === "quote" ? "Send request" : "Remove at cycle end"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
