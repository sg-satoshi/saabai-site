"use client";

import { useEffect, useState } from "react";
import SbNav from "../../components/sb/SbNav";
import "../../components/sb/checkout.css";
import { gaEvent } from "@/lib/ga";
import { PRESENCE, PRESENCE_ITEM } from "@/lib/website-presence";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const aud = (n: number) => `$${n.toLocaleString("en-AU")}`;

export default function BuyClient({ cancelled }: { cancelled: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(cancelled ? "Payment was cancelled. You have not been charged." : null);

  useEffect(() => {
    fetch("/api/websites/checkout")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEnabled(Boolean(d?.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/websites/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, business }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) {
        gaEvent("begin_checkout", { currency: "AUD", value: PRESENCE.deposit, items: [PRESENCE_ITEM] });
        window.location.href = d.url;
        return;
      }
      if (d.fallback) setEnabled(false);
      setError(d.error || "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  const enquire = `mailto:hello@saabai.ai?subject=${encodeURIComponent("Presence website: buy now")}&body=${encodeURIComponent(
    `Hi Shane,\n\nI'd like to buy a Presence website (${aud(PRESENCE.build)}).\n\nBusiness: ${business}\n\nThanks`,
  )}`;

  return (
    <div className="sb">
      <SbNav minimal right={<a className="btn sm" href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a>} />
      <div className="wrap" style={{ maxWidth: 640, paddingTop: 32, paddingBottom: 64 }}>
        <div className="steps" style={{ justifyContent: "center" }}>
          <b>1 Deposit</b>›<span>2 Onboarding</span>›<span>3 Build</span>
        </div>
        <span className="eyebrow" style={{ display: "block", marginTop: 24 }}>Checkout</span>
        <h1 style={{ fontSize: 34, marginTop: 10 }}>Presence website deposit</h1>
        <p className="dim" style={{ marginTop: 10, fontSize: 15 }}>Pay the deposit to lock your build start. Balance before go-live.</p>

        <div className="card sum" style={{ marginTop: 22 }} aria-label="Order summary">
          <div className="li"><span>Presence website build (fixed price)</span><b>{aud(PRESENCE.build)}</b></div>
          <div className="li"><span>Presence care, billed from go-live</span><b>{aud(PRESENCE.care)}/mo</b></div>
          <div className="li"><span>Deposit due today</span><b>{aud(PRESENCE.deposit)}</b></div>
          <div className="li"><span>Balance, invoiced before go-live</span><b>{aud(PRESENCE.balance)}</b></div>
          <div className="tot"><span>Pay now</span><span>{aud(PRESENCE.deposit)} AUD</span></div>
        </div>
        <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>GST not applicable. Card via Stripe. You will get a receipt by email.</p>

        {enabled === false ? (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 15 }}>Online payment is coming soon. Email Shane and he will reply within one business day with a secure payment link.</p>
            <a className="btn full" href={enquire} style={{ marginTop: 16 }}>Email to buy Presence</a>
            <a className="btn ghost full" href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>Or book a Free 30-Min Call</a>
          </div>
        ) : (
          <form onSubmit={pay} style={{ marginTop: 20, display: "grid", gap: 14 }}>
            <label>Email for receipt
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>Business name
              <input type="text" required autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} />
            </label>
            <button className="btn full" type="submit" disabled={busy || enabled === null} style={{ minHeight: 48 }}>
              {busy ? "Opening Stripe..." : `Pay ${aud(PRESENCE.deposit)} deposit with Stripe`}
            </button>
          </form>
        )}
        {error && <div className="err" role="alert">{error}</div>}

        <div className="note" style={{ marginTop: 20, fontSize: 13 }} id="terms">
          <b style={{ color: "var(--teal)" }}>Terms.</b> Fixed Presence scope (as on <a href="/websites">/websites</a>) with {PRESENCE.revisions} rounds of revisions. The {aud(PRESENCE.deposit)} deposit is refundable only before work starts. The {aud(PRESENCE.balance)} balance is invoiced before go-live, and your {aud(PRESENCE.care)}/mo care plan starts automatically at go-live. Custom work is quoted separately.
        </div>
      </div>
    </div>
  );
}
