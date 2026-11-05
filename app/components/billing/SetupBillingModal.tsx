"use client";
/**
 * Site Factory: Set up billing (step 1 form, step 2 email preview, sent).
 * Mockups 51, 52, 53.
 */
import React, { useEffect, useMemo, useState } from "react";
import "./billing.css";
import { aud } from "./status";
import { WEBSITE_TIERS } from "@/lib/website-tiers";

type Plan = { id: string; name: string; blurb: string; priceCents: number; visible: boolean };
type Sender = { value: string; label: string };

export type SetupSite = { id: string; name: string; domain?: string; contactName?: string; contactEmail?: string };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });
const maxDate = () => { const d = new Date(`${today()}T00:00:00`); d.setDate(d.getDate() + 90); return d.toLocaleDateString("en-CA"); };
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

export function SetupBillingModal({ site, onClose, onDone }: { site: SetupSite; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gstRegistered, setGstRegistered] = useState(false);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [name, setName] = useState(site.contactName || "");
  const [email, setEmail] = useState(site.contactEmail || "");
  const [planId, setPlanId] = useState("presence");
  const [custom, setCustom] = useState(false);
  const [customAmt, setCustomAmt] = useState("");
  const [customLabel, setCustomLabel] = useState("Website care");
  const [startDate, setStartDate] = useState(today());
  const [setupFee, setSetupFee] = useState("");
  const [setupDesc, setSetupDesc] = useState("");
  const [setupTouched, setSetupTouched] = useState(false);
  const [sdType, setSdType] = useState<"none" | "percent" | "amount">("none");
  const [sdValue, setSdValue] = useState("");
  const [sdLabel, setSdLabel] = useState("Mates rates");
  const [gst, setGst] = useState(false);
  const [sender, setSender] = useState("");
  const [discType, setDiscType] = useState<"none" | "percent" | "amount">("none");
  const [discValue, setDiscValue] = useState("");
  const [discMonths, setDiscMonths] = useState(""); // blank = forever
  const [discLabel, setDiscLabel] = useState("Mates rates");
  const [preview, setPreview] = useState<{ subject: string; html: string; from: string; to: string } | null>(null);
  const [sent, setSent] = useState<{ payUrl: string; emailed: boolean; linkExpiresAt?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/billing/catalog").then((r) => r.json()).then((d) => {
      const vis = (d.catalog?.plans || []).filter((p: Plan) => p.visible);
      setPlans(vis);
      setGstRegistered(!!d.catalog?.gstRegistered);
      if (vis[0]) setPlanId(vis[0].id);
    }).catch(() => {});
    fetch("/api/admin/billing/setup").then((r) => r.json()).then((d) => { setSenders(d.senders || []); setSender(d.senders?.[0]?.value || ""); }).catch(() => {});
  }, []);

  const plan = plans.find((p) => p.id === planId);
  // Default the setup fee to the published "from" build price for the plan (admin can edit).
  useEffect(() => {
    if (setupTouched || custom || !plan) return;
    const tier = WEBSITE_TIERS.find((t) => t.name.toLowerCase() === plan.name.toLowerCase());
    if (tier) { setSetupFee(String(tier.buildFrom)); setSetupDesc((d) => d || `${tier.name} site build`); }
  }, [plan, custom, setupTouched]);
  const monthly = custom ? Math.round((parseFloat(customAmt) || 0) * 100) : plan?.priceCents || 0;
  const discNum = parseFloat(discValue) || 0;
  const discOff = discType === "percent" ? Math.min(monthly, Math.round((monthly * Math.min(discNum, 100)) / 100)) : discType === "amount" ? Math.min(monthly, Math.round(discNum * 100)) : 0;
  const net = monthly - discOff;
  const discMonthsN = parseInt(discMonths, 10) || 0;
  const discText = discOff ? `${discLabel.trim() || "Discount"} (${discType === "percent" ? `${discNum}% off` : `${aud(Math.round(discNum * 100))} off`}${discMonthsN ? `, ${discMonthsN === 1 ? "first month" : `${discMonthsN} months`}` : ""})` : "";
  const setupCents = Math.round((parseFloat(setupFee) || 0) * 100);
  const sdNum = parseFloat(sdValue) || 0;
  const setupOff = sdType === "percent" ? Math.min(setupCents, Math.round((setupCents * Math.min(sdNum, 100)) / 100)) : sdType === "amount" ? Math.min(setupCents, Math.round(sdNum * 100)) : 0;
  const setupNet = setupCents - setupOff;
  const sdText = setupOff ? `${sdLabel.trim() || "Discount"} (${sdType === "percent" ? `${sdNum}% off` : `${aud(Math.round(sdNum * 100))} off`})` : "";
  // Nets must be $0 (waived) or at least $1, so Stripe never sees a sub-minimum amount.
  const badNet = (n: number) => n > 0 && n < 100;
  const planName = custom ? customLabel || "Website care" : plan?.name || "";
  const gstCents = gst ? Math.round((net + setupNet) * 0.1) : 0;
  const nextDate = useMemo(() => {
    const d = new Date(`${startDate}T00:00:00`);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }, [startDate]);
  const startDay = new Date(`${startDate}T00:00:00`).getDate();
  const isFuture = startDate > today();
  const firstLabel = new Date(`${startDate}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

  const payload = () => ({
    siteId: site.id, siteName: site.name, siteDomain: site.domain, contactName: name.trim(), contactEmail: email.trim(),
    planId: custom ? "custom" : planId, customCents: custom ? monthly : undefined, customLabel: custom ? customLabel : undefined,
    setupFeeCents: setupCents, setupFeeDescription: setupDesc.trim() || undefined, startDate, gst, sender,
    setupDiscount: setupOff ? { type: sdType, value: sdType === "percent" ? sdNum : Math.round(sdNum * 100), label: sdLabel.trim() || undefined } : undefined,
    discount: discOff ? { type: discType, value: discType === "percent" ? discNum : Math.round(discNum * 100), months: discMonthsN || undefined, label: discLabel.trim() || undefined } : undefined,
  });

  async function call(action: string) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/billing/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...payload() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong");
      return d;
    } catch (e) { setErr((e as Error).message); return null; } finally { setBusy(false); }
  }

  async function toPreview() {
    const d = await call("preview");
    if (d?.preview) { setPreview(d.preview); setStep(2); }
  }
  async function send() {
    const d = await call("send");
    if (d?.ok) { setSent({ payUrl: d.payUrl, emailed: d.emailed, linkExpiresAt: d.linkExpiresAt }); setStep(3); onDone(); }
  }

  return (
    <div className="bl bl-ov" onClick={() => !busy && onClose()}>
      <div className={`bl-modal ${step === 2 ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label="Set up billing" onClick={(e) => e.stopPropagation()}>
        <div className="bl-mh">
          {step < 3 && <p className="bl-step">Step {step} of 2</p>}
          <h3>{step === 1 ? "Set up billing" : step === 2 ? "Preview client email" : "Payment link sent"}</h3>
          <div className="sub">{site.name}{site.domain ? ` · ${site.domain}` : ""}</div>
          <button className="bl-x" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div className="bl-mb">
            <div className="bl-lbl">Client contact</div>
            <div className="bl-g2">
              <div><div className="bl-sl">Name</div><input className="bl-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jess Nguyen" /></div>
              <div><div className="bl-sl">Email</div><input className="bl-in" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jess@business.com.au" /></div>
            </div>

            <div className="bl-lbl">Plan <button type="button" className="bl-link" onClick={() => setCustom((c) => !c)}>{custom ? "Use a standard plan" : "Use a custom amount"}</button></div>
            {custom ? (
              <div className="bl-g2">
                <div><div className="bl-sl">Label</div><input className="bl-in" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} /></div>
                <div><div className="bl-sl">Monthly amount</div><div className="bl-pre"><span>$</span><input className="bl-in num" inputMode="decimal" value={customAmt} onChange={(e) => setCustomAmt(e.target.value)} placeholder="50.00" /></div></div>
              </div>
            ) : (
              <select className="bl-in" value={planId} onChange={(e) => setPlanId(e.target.value)} aria-label="Plan">
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {aud(p.priceCents)}/mo</option>)}
              </select>
            )}
            <div className="bl-help">Plans: {plans.map((p) => `${p.name} ${aud(p.priceCents).replace(".00", "")}`).join(" · ")}. Pick a plan, then add a discount below so the client sees the saving.</div>

            <div className="bl-lbl"><span>Discount<span className="opt">Optional</span></span></div>
            <div className="bl-g2">
              <div><div className="bl-sl">Type</div>
                <select className="bl-in" value={discType} onChange={(e) => setDiscType(e.target.value as typeof discType)} aria-label="Discount type">
                  <option value="none">No discount</option>
                  <option value="percent">% off per month</option>
                  <option value="amount">$ off per month</option>
                </select>
              </div>
              {discType !== "none" && (
                <div><div className="bl-sl">{discType === "percent" ? "Percent off" : "Amount off per month"}</div>
                  <div className="bl-pre"><span>{discType === "percent" ? "%" : "$"}</span><input className="bl-in num" inputMode="decimal" value={discValue} onChange={(e) => setDiscValue(e.target.value)} placeholder={discType === "percent" ? "50" : "100.00"} aria-label="Discount value" /></div>
                </div>
              )}
            </div>
            {discType !== "none" && (
              <div className="bl-g2" style={{ marginTop: 8 }}>
                <div><div className="bl-sl">Label the client sees</div><input className="bl-in" value={discLabel} onChange={(e) => setDiscLabel(e.target.value)} placeholder="Mates rates" maxLength={40} /></div>
                <div><div className="bl-sl">How long</div>
                  <select className="bl-in" value={discMonths} onChange={(e) => setDiscMonths(e.target.value)} aria-label="Discount duration">
                    <option value="">Forever</option>
                    {[1, 2, 3, 6, 12, 24].map((m) => <option key={m} value={String(m)}>{m === 1 ? "First month only" : `${m} months`}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="bl-g2" style={{ marginTop: 14 }}>
              <div>
                <div className="bl-lbl" style={{ marginTop: 0 }}>First payment date</div>
                <input className="bl-in num" type="date" value={startDate} min={today()} max={maxDate()} onChange={(e) => setStartDate(e.target.value)} />
                <div className="bl-help">{isFuture ? `Card saved at checkout, nothing charged until ${firstLabel}. Renews monthly on the ${ordinal(startDay || 1)}.` : "Charged when the client pays, then monthly on that day."} Up to 90 days out.</div>
              </div>
              <div>
                <div className="bl-lbl" style={{ marginTop: 0 }}><span>Setup fee<span className="opt">Optional</span></span></div>
                <div className="bl-pre"><span>$</span><input className="bl-in num" inputMode="decimal" value={setupFee} onChange={(e) => { setSetupTouched(true); setSetupFee(e.target.value); }} placeholder="0.00" /></div>
                <div className="bl-help">Site build, one-off, charged up front. Defaults to the published from price.</div>
              </div>
            </div>
            {setupCents > 0 && (
              <>
                <div className="bl-sl" style={{ marginTop: 12 }}>Setup fee description</div>
                <input className="bl-in" value={setupDesc} onChange={(e) => setSetupDesc(e.target.value)} placeholder="Domain transfer and email setup" />
                <div className="bl-lbl"><span>Setup fee discount<span className="opt">Optional</span></span></div>
                <div className="bl-g2">
                  <div><div className="bl-sl">Type</div>
                    <select className="bl-in" value={sdType} onChange={(e) => setSdType(e.target.value as typeof sdType)} aria-label="Setup fee discount type">
                      <option value="none">No discount</option>
                      <option value="percent">% off setup fee</option>
                      <option value="amount">$ off setup fee</option>
                    </select>
                  </div>
                  {sdType !== "none" && (
                    <div><div className="bl-sl">{sdType === "percent" ? "Percent off (100 waives it)" : "Amount off"}</div>
                      <div className="bl-pre"><span>{sdType === "percent" ? "%" : "$"}</span><input className="bl-in num" inputMode="decimal" value={sdValue} onChange={(e) => setSdValue(e.target.value)} placeholder={sdType === "percent" ? "50" : "500.00"} aria-label="Setup fee discount value" /></div>
                    </div>
                  )}
                </div>
                {sdType !== "none" && (
                  <div style={{ marginTop: 8 }}><div className="bl-sl">Label the client sees</div><input className="bl-in" value={sdLabel} onChange={(e) => setSdLabel(e.target.value)} placeholder="Mates rates" maxLength={40} /></div>
                )}
              </>
            )}

            <div className="bl-tog">
              <button type="button" className={`bl-sw ${gst ? "on" : ""}`} role="switch" aria-checked={gst} aria-label="Charge GST" disabled={!gstRegistered} onClick={() => setGst((g) => !g)} />
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>Charge GST</div><div className="bl-help" style={{ marginTop: 0 }}>{gstRegistered ? (gst ? "On · 10% added" : "Off") : "Off · GST not applicable. Ready for when you register."}</div></div>
            </div>

            <div className="bl-sum">
              <div className="r"><span>First month, {planName}</span><span className="num">{discOff ? <><s style={{ opacity: 0.6, marginRight: 6 }}>{aud(monthly)}</s>{aud(net)}</> : aud(monthly)}</span></div>
              {discOff > 0 && <div className="r"><span>{discText}</span><span className="num">-{aud(discOff)}</span></div>}
              {setupCents > 0 && <div className="r"><span>Setup fee</span><span className="num">{setupOff ? <><s style={{ opacity: 0.6, marginRight: 6 }}>{aud(setupCents)}</s>{setupNet ? aud(setupNet) : "Waived"}</> : aud(setupCents)}</span></div>}
              {setupOff > 0 && <div className="r"><span>{sdText}</span><span className="num">-{aud(setupOff)}</span></div>}
              {gst && <div className="r"><span>GST</span><span className="num">{aud(gstCents)}</span></div>}
              <div className="r t"><span>{isFuture ? `First payment on ${firstLabel}` : "Due today"}</span><span className="num">{aud(net + setupNet + gstCents)}</span></div>
              <div className="r"><span>{isFuture ? `Then monthly from ${nextDate}` : "Then monthly, on the day they pay"}</span><span className="num" style={{ fontWeight: 600 }}>{discOff ? <s style={{ opacity: 0.6, marginRight: 6, fontWeight: 400 }}>{aud(monthly + (gst ? Math.round(monthly * 0.1) : 0))}</s> : null}{aud(net + (gst ? Math.round(net * 0.1) : 0))}</span></div>
              {discOff > 0 && discMonthsN > 0 && <div className="r"><span>After {discMonthsN === 1 ? "the first month" : `${discMonthsN} months`}</span><span className="num">{aud(monthly + (gst ? Math.round(monthly * 0.1) : 0))}/mo</span></div>}
              <div className="ft">AUD · {gst ? "GST included" : "GST not applicable"} · Stripe payment link created when you send, valid 7 days</div>
            </div>
            {err && <div className="bl-err">{err}</div>}
          </div>
        )}

        {step === 2 && preview && (
          <div className="bl-mb">
            <dl className="bl-meta">
              <dt>From</dt>
              <dd>
                <select className="bl-in" style={{ height: 32 }} value={sender} onChange={(e) => setSender(e.target.value)} aria-label="Sender">
                  {senders.map((s) => <option key={s.value} value={s.value}>{s.label} ({s.value.replace(/^.*</, "").replace(">", "")})</option>)}
                </select>
              </dd>
              <dt>To</dt><dd>{preview.to}</dd>
              <dt>Subject</dt><dd>{preview.subject}</dd>
            </dl>
            <iframe className="bl-frame" title="Email preview" sandbox="" srcDoc={preview.html} />
            {err && <div className="bl-err">{err}</div>}
          </div>
        )}

        {step === 3 && sent && (
          <div className="bl-mb">
            <div className="bl-done">
              <div className="ic">✓</div>
              <div style={{ fontWeight: 600 }}>{sent.emailed ? `Emailed to ${email}` : "Link created, email not sent"}</div>
              <div className="bl-help">Status is now Pending payment. The link expires {sent.linkExpiresAt ? new Date(sent.linkExpiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "in 7 days"}.</div>
            </div>
            <div className="bl-copy">
              <span>Payment link</span>
              <code className="num">{sent.payUrl.replace(/^https?:\/\//, "")}</code>
              <button className="bl-btn sm" onClick={() => { navigator.clipboard?.writeText(sent.payUrl); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
            </div>
          </div>
        )}

        <div className="bl-mf">
          {step === 1 && <><button className="bl-btn" onClick={onClose}>Cancel</button><button className="bl-btn pri" disabled={busy || !email || monthly <= 0 || badNet(net) || badNet(setupNet)} onClick={toPreview}>{busy ? "Loading…" : "Preview email"}</button></>}
          {step === 2 && <><button className="bl-btn" onClick={() => setStep(1)} disabled={busy}>Back</button><button className="bl-btn pri" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send email"}</button></>}
          {step === 3 && <button className="bl-btn pri" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}
