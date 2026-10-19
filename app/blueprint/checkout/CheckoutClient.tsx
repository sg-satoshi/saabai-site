"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import SbNav from "../../components/sb/SbNav";
import "../../components/sb/checkout.css";
import { gaEvent } from "@/lib/ga";
import { TIERS, TIER_ORDER, aud, type BlueprintTier } from "@/lib/blueprint";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PUBLISHABLE = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export default function CheckoutClient({ initialTier, cancelled }: { initialTier: BlueprintTier; cancelled: boolean }) {
  const [tier, setTier] = useState<BlueprintTier>(initialTier);
  const [enabled, setEnabled] = useState<Record<BlueprintTier, boolean> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPay, setLoadingPay] = useState(true);
  const [couponNote, setCouponNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(cancelled ? "Payment was cancelled. You have not been charged." : null);
  const t = TIERS[tier];
  const stripePromise = useMemo(() => (PUBLISHABLE ? loadStripe(PUBLISHABLE) : null), []);

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

  // Create an embedded Checkout Session as soon as the tier is ready.
  useEffect(() => {
    let cancelledFetch = false;
    setClientSecret(null);
    setLoadingPay(true);
    setError(null);
    setCouponNote(null);

    if (enabled === null) return;
    const online = (enabled[tier] ?? false) && Boolean(PUBLISHABLE);
    if (!online) {
      setLoadingPay(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/blueprint/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // ?code=XYZ on the checkout URL pre-applies a promo code.
          body: JSON.stringify({ tier, ui_mode: "embedded", code: new URLSearchParams(window.location.search).get("code") || undefined }),
        });
        const d = await res.json().catch(() => ({}));
        if (cancelledFetch) return;
        if (res.ok && d.clientSecret) {
          setClientSecret(d.clientSecret);
          setCouponNote(typeof d.couponError === "string" ? d.couponError : null);
          gaEvent("begin_checkout", { currency: "AUD", value: t.price, items: [{ item_id: `blueprint_${tier}`, item_name: `Saabai Blueprint ${t.name}`, item_category: "blueprint", price: t.price, quantity: 1 }] });
          setLoadingPay(false);
          return;
        }
        if (d.fallback) setEnabled((p) => (p ? { ...p, [tier]: false } : p));
        setError(d.error || "Something went wrong. Please try again.");
      } catch {
        if (!cancelledFetch) setError("Something went wrong. Please try again.");
      }
      if (!cancelledFetch) setLoadingPay(false);
    })();

    return () => {
      cancelledFetch = true;
    };
  }, [tier, enabled]);

  const online = (enabled?.[tier] ?? false) && Boolean(PUBLISHABLE) && Boolean(stripePromise);
  const enquireHref = `mailto:hello@saabai.ai?subject=${encodeURIComponent(`${t.name} Blueprint enquiry`)}&body=${encodeURIComponent(
    `Hi Shane,\n\nI'd like to get a ${t.name} Blueprint (${t.priceLabel}).\n\nThanks`,
  )}`;

  return (
    <div className="sb">
      <SbNav minimal right={<span className="dim" style={{ fontSize: 14 }}>Secure checkout</span>} />
      <div className="wrap">
        <div className="lay">
          <div>
            <div className="steps">
              <b>1 Pay</b>›<span>2 Fact-find</span>›<span>3 Blueprint</span>
            </div>
            <h2 style={{ marginTop: 14, fontSize: 34 }}>Get your Saabai Blueprint</h2>
            <p className="dim" style={{ marginTop: 10, fontSize: 15, maxWidth: 560 }}>
              Pay on this page by card, Apple Pay or Google Pay. Your invoice is emailed the moment payment clears.
            </p>

            <div className="card" style={{ marginTop: 24 }}>
              <h3>Your tier</h3>
              <div className="tiers" style={{ marginTop: 14 }} role="radiogroup" aria-label="Blueprint tier">
                {TIER_ORDER.map((id) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={tier === id}
                    key={id}
                    className={tier === id ? "on" : ""}
                    onClick={() => setTier(id)}
                  >
                    <b>
                      {TIERS[id].name}
                      {tier === id ? " ✓" : ""}
                    </b>
                    {TIERS[id].priceLabel}
                    <br />
                    <span className="dim" style={{ fontSize: 12 }}>
                      {TIERS[id].short}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card" id="blueprint-pay" style={{ marginTop: 20 }}>
              <h3 style={{ margin: 0 }}>Pay {t.priceLabel}</h3>
              <p className="dim" style={{ marginTop: 10, fontSize: 14 }}>
                Just your name and email to pay. Phone, business name and website are optional. We&apos;ll use your email for your invoice and fact-find.
              </p>

              {enabled === null || loadingPay ? (
                <p style={{ marginTop: 18 }}>Preparing secure payment...</p>
              ) : online && clientSecret && stripePromise ? (
                <div className="embed" style={{ marginTop: 16 }} key={clientSecret}>
                  <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              ) : online && !clientSecret ? (
                <p style={{ marginTop: 18 }}>Could not load payment. Please refresh and try again.</p>
              ) : (
                <>
                  <p style={{ marginTop: 18, fontSize: 15 }}>
                    Online payment is coming soon. Email Shane and he will reply within one business day with a secure payment link.
                  </p>
                  <a className="btn full" href={enquireHref} style={{ marginTop: 22 }}>
                    Enquire about {t.name} Blueprint
                  </a>
                  <a className="btn ghost full" href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>
                    Or book a quick call
                  </a>
                </>
              )}

              <ul className="trust">
                <li>Encrypted by Stripe</li>
                <li>Card, Apple Pay, Google Pay</li>
                <li>Invoice emailed instantly</li>
              </ul>
              {couponNote && (
                <div className="err" role="status">
                  {couponNote} You can still pay the standard price below.
                </div>
              )}
              {error && (
                <div className="err" role="alert">
                  {error}
                </div>
              )}
            </div>
          </div>

          <aside className="card sum feat" aria-label="Order summary">
            <span className="eyebrow">Order summary</span>
            <h3 style={{ margin: "12px 0 4px", fontSize: 22 }}>{t.name} Blueprint</h3>
            <p style={{ fontSize: 14 }}>{t.who}</p>
            <ul className="tick" style={{ margin: "18px 0" }}>
              {t.features.slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="li">
              <span>{t.name} Blueprint</span>
              <b>{aud(t.price, true)}</b>
            </div>
            <div className="li">
              <span>GST</span>
              <b>Not applicable</b>
            </div>
            <div className="li">
              <span>Delivery</span>
              <b>{t.delivery}</b>
            </div>
            <div className="tot">
              <span>Total (AUD)</span>
              <span>{aud(t.price, true)}</span>
            </div>
            <div className="note">
              <b style={{ color: "var(--teal)" }}>30 day build credit.</b> Book any Saabai build within 30 days of delivery and the full {t.priceLabel} comes off your build invoice.
            </div>
            <ul className="trust" style={{ marginTop: 16 }}>
              <li>Australian business</li>
              <li>Secure Stripe payments</li>
              <li>Full refund if work hasn&apos;t begun</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
