"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { confirmDialog, notify } from "../../ui/Feedback";
import { brisbaneLabel, describeCoverage, normaliseCode, shareLinks } from "@/lib/coupons/core";
import ProductPicker from "./ProductPicker";

interface Code {
  id: string; code: string; active: boolean; timesRedeemed: number; maxRedemptions: number | null; expiresAt: number | null; startsAt?: number | null;
  percentOff: number | null; amountOff: number | null; duration: string; durationMonths: number | null;
  target: string; targets?: string[]; unknownProducts?: number; firstTimeOnly: boolean; oncePerCustomer?: boolean; minimumSpend: number | null; created: number;
}
interface Target { id: string; label: string; productId: string | null; ready: boolean; note?: string }

const money = (c: number) => `$${(c / 100).toLocaleString("en-AU", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;
const SITE = "https://www.saabai.ai";

type ShareInfoT = ReturnType<typeof shareLinks>;
/** One Copy link control per coupon: a product choice appears only when the code covers several linkable products. */
function CopyLink({ info, picked, onPick, onCopy }: { info: ShareInfoT; picked?: string; onPick: (id: string) => void; onCopy: (t: string) => void }) {
  if (!info.links.length) {
    return info.careNote
      ? <Button size="sm" variant="gh" title="Care plan pay links are per client. Add this to the end of a client's pay link." onClick={() => onCopy(info.paySuffix)}>Copy ?code= for pay link</Button>
      : null;
  }
  const current = info.links.find((l) => l.id === picked) ?? info.links[0];
  return (
    <>
      {info.links.length > 1 && (
        <select aria-label="Product for the link" className="of-linksel" value={current.id} onChange={(e) => onPick(e.target.value)}>
          {info.links.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      )}
      <Button size="sm" variant="gh" title={current.url} onClick={() => onCopy(current.url)}>Copy link</Button>
      {info.careNote && <Button size="sm" variant="gh" title="Care plan pay links are per client. Add this to the end of a client's pay link." onClick={() => onCopy(info.paySuffix)}>Copy ?code= for pay link</Button>}
    </>
  );
}

const blank = { code: "", kind: "percent" as "percent" | "fixed", value: "", targetMode: "all" as "all" | "selected", targets: [] as string[], duration: "once" as "once" | "forever" | "repeating", durationMonths: "3", firstTimeOnly: true, oncePerCustomer: false, minimumSpend: "", maxRedemptions: "", startsAt: "", expiresAt: "" };

export default function OffersClient() {
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/coupons");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't load codes");
      setCodes(d.codes || []);
      setTargets(d.targets || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const careMissing = targets.some((t) => t.id.startsWith("care_") && !t.ready);
  const shown = useMemo(() => (codes ?? []).filter((c) => filter === "all" || c.active), [codes, filter]);
  const activeCount = (codes ?? []).filter((c) => c.active).length;
  const redeemed = (codes ?? []).reduce((n, c) => n + c.timesRedeemed, 0);

  async function create() {
    setSaving(true); setFormErr(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, targetMode: undefined, targets: f.targetMode === "selected" ? f.targets : [], value: parseFloat(f.value), durationMonths: f.duration === "repeating" ? f.durationMonths : undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't create the code");
      notify.success(`${d.code} is live`);
      setF(blank);
      await load();
    } catch (e) { setFormErr(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  }

  async function setupProducts() {
    if (!(await confirmDialog("This creates three fixed products in Stripe (Presence, Growth and Signature website care) so codes can be limited to one care plan. Existing subscriptions aren't touched. Running it again changes nothing.", { confirmLabel: "Set up products" }))) return;
    setSettingUp(true);
    try {
      const res = await fetch("/api/admin/coupons/setup-products", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Setup failed");
      notify.success("Care plan products are ready");
      await load();
    } catch (e) { notify.error(e instanceof Error ? e.message : String(e)); } finally { setSettingUp(false); }
  }

  async function deactivate(c: Code) {
    if (!(await confirmDialog(`Turn off ${c.code}? Customers won't be able to use it any more. Past discounts stay as they are.`, { confirmLabel: "Turn off", danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      notify.success(`${c.code} turned off`);
      await load();
    } catch (e) { notify.error(e instanceof Error ? e.message : String(e)); }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); notify.success("Link copied"); } catch { window.prompt("Copy this link (Ctrl+C)", text); }
  }

  const off = (c: Code) => (c.percentOff != null ? `${c.percentOff}% off` : c.amountOff != null ? `${money(c.amountOff)} off` : "");
  const durationLabel = (c: Code) => (c.duration === "repeating" ? `first ${c.durationMonths} months` : c.duration === "forever" ? "every payment" : "first payment");
  const status = (c: Code) => {
    if (!c.active) return <Badge tone="neutral">Off</Badge>;
    if (c.startsAt && c.startsAt * 1000 > Date.now()) return <Badge tone="info">Scheduled</Badge>;
    if (c.expiresAt && c.expiresAt * 1000 < Date.now()) return <Badge tone="neutral">Expired</Badge>;
    if (c.maxRedemptions && c.timesRedeemed >= c.maxRedemptions) return <Badge tone="warn">Used up</Badge>;
    return <Badge tone="ok">Active</Badge>;
  };
  // Which product's link is chosen per code (only matters when a code covers several).
  const [linkPick, setLinkPick] = useState<Record<string, string>>({});
  const shareOf = (c: Code) => shareLinks(c.code, c.targets ?? (c.target === "all" || c.target === "product" ? [] : [c.target]), c.unknownProducts ?? 0, SITE);

  return (
    <div className="pg">
      <div className="ph">
        <div>
          <div className="crumb">Marketing / <b>Offers &amp; Coupons</b></div>
          <h1>Offers &amp; Coupons</h1>
          <p className="sub">Promo codes work on Blueprint checkout and care plan pay links. Customers type them on the Stripe page, or you send a link with the code already applied.</p>
        </div>
      </div>

      <div className="kpis k3">
        <div className="card kpi"><div className="l">Active codes</div><div className="v">{codes ? activeCount : "–"}</div></div>
        <div className="card kpi"><div className="l">Times redeemed</div><div className="v">{codes ? redeemed : "–"}</div></div>
        <div className="card kpi"><div className="l">Products ready</div><div className="v">{targets.length ? `${targets.filter((t) => t.id !== "all" && t.ready).length}/6` : "–"}</div></div>
      </div>

      {careMissing && (
        <div style={{ marginBottom: 16 }}>
          <Card>
            <CardBody>
              <div className="of-setup">
                <div>
                  <b>Care plan products aren&apos;t set up yet</b>
                  <p className="muted of-meta">Codes for &quot;All products&quot; already work on care plans. To limit a code to one care plan, create the three fixed Stripe products first.</p>
                </div>
                <Button variant="acc" onClick={setupProducts} disabled={settingUp}>{settingUp ? "Setting up…" : "Set up coupon products"}</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="of-grid">
        <Card>
          <CardHeader title="New code" />
          <CardBody>
            <div className="of-form">
              <div className="of-f">
                <label htmlFor="of-code">Code</label>
                <input id="of-code" value={f.code} onChange={(e) => setF({ ...f, code: normaliseCode(e.target.value) })} placeholder="NEWCLIENT50" autoCapitalize="characters" />
              </div>
              <div className="of-f">
                <span className="lb">Discount</span>
                <div className="of-row">
                  <div className="of-seg" role="group" aria-label="Discount type">
                    <button type="button" className={f.kind === "percent" ? "on" : ""} onClick={() => setF({ ...f, kind: "percent" })}>% off</button>
                    <button type="button" className={f.kind === "fixed" ? "on" : ""} onClick={() => setF({ ...f, kind: "fixed" })}>$ off</button>
                  </div>
                  <input aria-label="Discount amount" type="number" inputMode="decimal" min="0" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder={f.kind === "percent" ? "50" : "100"} />
                </div>
              </div>
              <ProductPicker mode={f.targetMode} value={f.targets} statuses={targets} onChange={(targetMode, t) => setF({ ...f, targetMode, targets: t })} />
              {f.targets.some((t) => t.startsWith("care_")) && <p className="hint">Care plan codes discount the monthly fee. Setup fees aren&apos;t discounted. Minimum spend is checked against the whole order.</p>}
              <div className="of-f">
                <label htmlFor="of-dur">How long (care plans)</label>
                <select id="of-dur" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value as typeof f.duration })}>
                  <option value="once">First payment only</option>
                  <option value="repeating">First few months</option>
                  <option value="forever">Every payment</option>
                </select>
                {f.duration === "repeating" && (
                  <input aria-label="Number of months" style={{ marginTop: 8 }} type="number" min="1" value={f.durationMonths} onChange={(e) => setF({ ...f, durationMonths: e.target.value })} placeholder="3 months" />
                )}
                <p className="hint">Blueprint is a one-off payment, so this only matters for care plans.</p>
              </div>
              <label className="of-tog">
                <input type="checkbox" checked={f.firstTimeOnly} onChange={(e) => setF({ ...f, firstTimeOnly: e.target.checked })} />
                <span>First-time customers only<span className="muted of-meta" style={{ display: "block" }}>Stripe blocks it for anyone who has paid you before.</span></span>
              </label>
              <label className="of-tog">
                <input type="checkbox" checked={f.oncePerCustomer} onChange={(e) => setF({ ...f, oncePerCustomer: e.target.checked })} />
                <span>One use per customer<span className="muted of-meta" style={{ display: "block" }}>We remember each customer by their email (stored scrambled, never in plain text) and refuse a second use. Checked on Sell, Payments, care plan pay links and Blueprint when we know the email. A second use made in Stripe&apos;s own checkout box is flagged afterwards rather than blocked.</span></span>
              </label>
              <div className="of-row">
                <div className="of-f">
                  <label htmlFor="of-min">Minimum spend ($)</label>
                  <input id="of-min" type="number" inputMode="decimal" min="0" value={f.minimumSpend} onChange={(e) => setF({ ...f, minimumSpend: e.target.value })} placeholder="None" />
                </div>
                <div className="of-f">
                  <label htmlFor="of-max">Max uses</label>
                  <input id="of-max" type="number" min="1" value={f.maxRedemptions} onChange={(e) => setF({ ...f, maxRedemptions: e.target.value })} placeholder="Unlimited" />
                </div>
              </div>
              <div className="of-f">
                <label htmlFor="of-start">Starts</label>
                <input id="of-start" type="date" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
                <p className="hint">Not live until 12:00 am Brisbane time on this day. Leave blank to start now. Applies to links we send and to Sell and Payments. A customer typing the code into Stripe&apos;s own promo box can&apos;t be held back, so for a hard launch date create the code on the day.</p>
              </div>
              <div className="of-f">
                <label htmlFor="of-exp">Expires</label>
                <input id="of-exp" type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} />
                <p className="hint">Works until 11:59 pm Brisbane time on this day. Leave blank for no expiry.</p>
              </div>
              {formErr && <p className="of-err" role="alert">{formErr}</p>}
              <Button variant="pri" className="of-btn-full" onClick={create} disabled={saving || !f.code || !f.value || (f.targetMode === "selected" && f.targets.length === 0)}>{saving ? "Creating…" : "Create code"}</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Codes${codes ? ` (${shown.length})` : ""}`}
            action={<div className="of-seg" style={{ width: 160 }}><button type="button" className={filter === "active" ? "on" : ""} onClick={() => setFilter("active")}>Active</button><button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>All</button></div>}
          />
          {err ? (
            <CardBody><p className="of-err">{err}</p><div style={{ marginTop: 10 }}><Button size="sm" onClick={load}>Retry</Button></div></CardBody>
          ) : codes == null ? (
            <CardBody><div className="of-sk" style={{ width: "40%" }} /><div className="of-sk" style={{ width: "80%" }} /><div className="of-sk" style={{ width: "60%" }} /></CardBody>
          ) : !shown.length ? (
            <CardBody><p className="muted">{codes.length ? "No active codes. Switch to All to see old ones." : "No codes yet. Create one on the left, for example NEWCLIENT50 at 50% off for first-time customers."}</p></CardBody>
          ) : (
            shown.map((c) => (
              <div className="oc" key={c.id} style={{ opacity: c.active ? 1 : 0.6 }}>
                <div className="r1"><span className="of-code">{c.code}</span>{status(c)}</div>
                <div className="of-tags">
                  <span className="tag bp">{off(c)}</span>
                  <span className="tag" title={(c.targets ?? []).length > 1 ? (c.targets ?? []).map((t) => describeCoverage([t])).join(", ") : undefined}>{describeCoverage(c.targets ?? (c.target === "all" || c.target === "product" ? [] : [c.target]), c.unknownProducts)}</span>
                  {c.firstTimeOnly && <span className="tag ws">First-time only</span>}
                  {c.oncePerCustomer && <span className="tag ws">One use per customer</span>}
                  {c.minimumSpend ? <span className="tag cr">Min {money(c.minimumSpend)}</span> : null}
                </div>
                <div className="muted of-meta">
                  <span className="num">{c.timesRedeemed}</span> used{c.maxRedemptions ? <> of <span className="num">{c.maxRedemptions}</span></> : ""} · {durationLabel(c)}{c.startsAt && c.startsAt * 1000 > Date.now() ? ` · starts ${brisbaneLabel(c.startsAt)}` : ""}{c.expiresAt ? ` · until ${brisbaneLabel(c.expiresAt)}` : " · no expiry"}
                </div>
                {c.active && (
                  <div className="r2 of-acts">
                    <CopyLink info={shareOf(c)} picked={linkPick[c.id]} onPick={(id) => setLinkPick({ ...linkPick, [c.id]: id })} onCopy={copy} />
                    <Button size="sm" variant="dg" onClick={() => deactivate(c)}>Turn off</Button>
                  </div>
                )}
              </div>
            ))
          )}
          <CardBody><p className="muted of-meta">Care plan pay links: add <span className="num">?code=YOURCODE</span> to the link to pre-apply a code, or the client can type it on the Stripe page. Every completed checkout records the code on the order, the audit and the client&apos;s journey.</p></CardBody>
        </Card>
      </div>
    </div>
  );
}
