"use client";
/**
 * Site Factory: Set up billing (step 1 form, step 2 email preview, sent).
 * Mockups 51, 52, 53.
 */
import React, { useEffect, useMemo, useState } from "react";
import "./billing.css";
import { aud } from "./status";

type Plan = { id: string; name: string; blurb: string; priceCents: number; visible: boolean };
type Sender = { value: string; label: string };

export type SetupSite = { id: string; name: string; domain?: string; contactName?: string; contactEmail?: string };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });
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
  const [gst, setGst] = useState(false);
  const [sender, setSender] = useState("");
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
  const monthly = custom ? Math.round((parseFloat(customAmt) || 0) * 100) : plan?.priceCents || 0;
  const setupCents = Math.round((parseFloat(setupFee) || 0) * 100);
  const planName = custom ? customLabel || "Website care" : plan?.name || "";
  const gstCents = gst ? Math.round((monthly + setupCents) * 0.1) : 0;
  const nextDate = useMemo(() => {
    const d = new Date(`${startDate}T00:00:00`);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }, [startDate]);
  const startDay = new Date(`${startDate}T00:00:00`).getDate();

  const payload = () => ({
    siteId: site.id, siteName: site.name, siteDomain: site.domain, contactName: name.trim(), contactEmail: email.trim(),
    planId: custom ? "custom" : planId, customCents: custom ? monthly : undefined, customLabel: custom ? customLabel : undefined,
    setupFeeCents: setupCents, setupFeeDescription: setupDesc.trim() || undefined, startDate, gst, sender,
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
            <div className="bl-help">Plans: {plans.map((p) => `${p.name} ${aud(p.priceCents).replace(".00", "")}`).join(" · ")}. Use a custom amount for discounts.</div>

            <div className="bl-g2" style={{ marginTop: 14 }}>
              <div>
                <div className="bl-lbl" style={{ marginTop: 0 }}>Start date</div>
                <input className="bl-in num" type="date" value={startDate} min={today()} onChange={(e) => setStartDate(e.target.value)} />
                <div className="bl-help">Renews monthly on the {ordinal(startDay || 1)}</div>
              </div>
              <div>
                <div className="bl-lbl" style={{ marginTop: 0 }}><span>Setup fee<span className="opt">Optional</span></span></div>
                <div className="bl-pre"><span>$</span><input className="bl-in num" inputMode="decimal" value={setupFee} onChange={(e) => setSetupFee(e.target.value)} placeholder="0.00" /></div>
                <div className="bl-help">One-off, charged up front</div>
              </div>
            </div>
            {setupCents > 0 && (
              <>
                <div className="bl-sl" style={{ marginTop: 12 }}>Setup fee description</div>
                <input className="bl-in" value={setupDesc} onChange={(e) => setSetupDesc(e.target.value)} placeholder="Domain transfer and email setup" />
              </>
            )}

            <div className="bl-tog">
              <button type="button" className={`bl-sw ${gst ? "on" : ""}`} role="switch" aria-checked={gst} aria-label="Charge GST" disabled={!gstRegistered} onClick={() => setGst((g) => !g)} />
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>Charge GST</div><div className="bl-help" style={{ marginTop: 0 }}>{gstRegistered ? (gst ? "On · 10% added" : "Off") : "Off · GST not applicable. Ready for when you register."}</div></div>
            </div>

            <div className="bl-sum">
              <div className="r"><span>First month, {planName}</span><span className="num">{aud(monthly)}</span></div>
              {setupCents > 0 && <div className="r"><span>Setup fee</span><span className="num">{aud(setupCents)}</span></div>}
              {gst && <div className="r"><span>GST</span><span className="num">{aud(gstCents)}</span></div>}
              <div className="r t"><span>Due up front</span><span className="num">{aud(monthly + setupCents + gstCents)}</span></div>
              <div className="r"><span>Then monthly from {nextDate}</span><span className="num" style={{ fontWeight: 600 }}>{aud(monthly + (gst ? Math.round(monthly * 0.1) : 0))}</span></div>
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
          {step === 1 && <><button className="bl-btn" onClick={onClose}>Cancel</button><button className="bl-btn pri" disabled={busy || !email || monthly <= 0} onClick={toPreview}>{busy ? "Loading…" : "Preview email"}</button></>}
          {step === 2 && <><button className="bl-btn" onClick={() => setStep(1)} disabled={busy}>Back</button><button className="bl-btn pri" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send email"}</button></>}
          {step === 3 && <button className="bl-btn pri" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}
