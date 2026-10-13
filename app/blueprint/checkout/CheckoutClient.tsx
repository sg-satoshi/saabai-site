"use client";

import { useEffect, useState } from "react";
import SbNav from "../../components/sb/SbNav";
import "../../components/sb/checkout.css";
import { TIERS, TIER_ORDER, aud, gstOf, type BlueprintTier } from "@/lib/blueprint";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

export default function CheckoutClient({ initialTier, cancelled }: { initialTier: BlueprintTier; cancelled: boolean }) {
  const [tier, setTier] = useState<BlueprintTier>(initialTier);
  const [enabled, setEnabled] = useState<Record<BlueprintTier, boolean> | null>(null);
  const [form, setForm] = useState({ name: "", email: "", business: "", phone: "", website: "", abn: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(cancelled ? "Payment was cancelled. You have not been charged." : null);
  const t = TIERS[tier];

  useEffect(() => {
    fetch("/api/blueprint/checkout")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEnabled(d?.tiers ?? { starter: false, pro: false, business: false }))
      .catch(() => setEnabled({ starter: false, pro: false, business: false }));
  }, []);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("tier", tier);
    u.searchParams.delete("cancelled");
    window.history.replaceState(null, "", u.toString());
  }, [tier]);

  const online = enabled?.[tier] ?? false;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const enquireHref = `mailto:hello@saabai.ai?subject=${encodeURIComponent(`${t.name} Blueprint enquiry`)}&body=${encodeURIComponent(
    `Hi Shane,\n\nI'd like to get a ${t.name} Blueprint (${t.priceLabel}).\n\nName: ${form.name}\nBusiness: ${form.business}\nPhone: ${form.phone}\nWebsite: ${form.website}\n\nThanks`,
  )}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!online) {
      window.location.href = enquireHref;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/blueprint/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, ...form }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) {
        window.location.href = d.url;
        return;
      }
      if (d.fallback) setEnabled((p) => (p ? { ...p, [tier]: false } : p));
      setError(d.error || "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  return (
    <div className="sb">
      <SbNav minimal right={<span className="dim" style={{ fontSize: 14 }}>🔒 Secure checkout</span>} />
      <div className="wrap">
        <div className="lay">
          <form onSubmit={submit}>
            <div className="steps"><b>1 Details</b>›<span>2 Payment</span>›<span>3 Fact-find</span></div>
            <h2 style={{ marginTop: 14, fontSize: 34 }}>Get your Saabai Blueprint</h2>
            <div className="card" style={{ marginTop: 24 }}>
              <h3>Your tier</h3>
              <div className="tiers" style={{ marginTop: 14 }} role="radiogroup" aria-label="Blueprint tier">
                {TIER_ORDER.map((id) => (
                  <button type="button" role="radio" aria-checked={tier === id} key={id} className={tier === id ? "on" : ""} onClick={() => setTier(id)}>
                    <b>{TIERS[id].name}{tier === id ? " ✓" : ""}</b>
                    {TIERS[id].priceLabel}
                    <br />
                    <span className="dim" style={{ fontSize: 12 }}>{TIERS[id].short}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="card" style={{ marginTop: 20 }}>
              <h3>Your details</h3>
              <div className="f2">
                <div className="fld"><label htmlFor="name">Full name</label><input id="name" required autoComplete="name" value={form.name} onChange={set("name")} /></div>
                <div className="fld"><label htmlFor="email">Work email</label><input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} /></div>
              </div>
              <div className="f2">
                <div className="fld"><label htmlFor="business">Business name</label><input id="business" required autoComplete="organization" value={form.business} onChange={set("business")} /></div>
                <div className="fld"><label htmlFor="phone">Phone (optional)</label><input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></div>
              </div>
              <div className="f2">
                <div className="fld"><label htmlFor="website">Website (optional)</label><input id="website" inputMode="url" placeholder="yourbusiness.com.au" value={form.website} onChange={set("website")} /></div>
                <div className="fld"><label htmlFor="abn">ABN (optional, for your tax invoice)</label><input id="abn" inputMode="numeric" placeholder="12 345 678 901" value={form.abn} onChange={set("abn")} /></div>
              </div>
            </div>
            <div className="card" style={{ marginTop: 20 }}>
              <h3>Payment</h3>
              {enabled === null ? (
                <p style={{ marginTop: 10 }}>Loading payment options...</p>
              ) : online ? (
                <>
                  <p style={{ marginTop: 10, fontSize: 15 }}>You will be taken to Stripe&apos;s secure checkout to pay by card, Apple Pay or Google Pay.</p>
                  <button className="btn full" type="submit" disabled={busy} style={{ marginTop: 22 }}>
                    {busy ? "Opening secure checkout..." : `Pay ${t.priceLabel} and start my Blueprint`}
                  </button>
                  <p className="dim" style={{ fontSize: 13, marginTop: 12, textAlign: "center" }}>Payments processed securely by Stripe. Tax invoice emailed instantly.</p>
                </>
              ) : (
                <>
                  <p style={{ marginTop: 10, fontSize: 15 }}>Online payment is coming soon. Send us your details and Shane will reply within one business day with a secure payment link.</p>
                  <button className="btn full" type="submit" style={{ marginTop: 22 }}>Enquire about {t.name} Blueprint</button>
                  <a className="btn ghost full" href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>Or book a quick call</a>
                </>
              )}
              {error && <div className="err" role="alert">{error}</div>}
            </div>
          </form>
          <div className="card sum feat">
            <span className="eyebrow">Order summary</span>
            <h3 style={{ margin: "12px 0 4px", fontSize: 22 }}>{t.name} Blueprint</h3>
            <p style={{ fontSize: 14 }}>{t.who}</p>
            <ul className="tick" style={{ margin: "18px 0" }}>
              {t.features.slice(0, 4).map((f) => <li key={f}>{f}</li>)}
            </ul>
            <div className="li"><span>{t.name} Blueprint</span><b>{aud(t.price, true)}</b></div>
            <div className="li"><span>Includes GST</span><b>{aud(gstOf(t.price), true)}</b></div>
            <div className="tot"><span>Total (AUD)</span><span>{aud(t.price, true)}</span></div>
            <div className="note"><b style={{ color: "var(--teal)" }}>30 day build credit.</b> Book any Saabai build within 30 days of delivery and the full {t.priceLabel} comes off your build.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
