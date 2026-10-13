"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import SbNav from "../../components/sb/SbNav";
import "../../components/sb/checkout.css";
import { TIERS, TIER_ORDER, aud, gstOf, type BlueprintTier } from "@/lib/blueprint";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const PUBLISHABLE = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

type FormState = { name: string; email: string; business: string; phone: string; website: string; abn: string };

export default function CheckoutClient({ initialTier, cancelled }: { initialTier: BlueprintTier; cancelled: boolean }) {
  const [tier, setTier] = useState<BlueprintTier>(initialTier);
  const [enabled, setEnabled] = useState<Record<BlueprintTier, boolean> | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", email: "", business: "", phone: "", website: "", abn: "" });
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
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

  // Changing tier resets the embedded session so the price matches.
  useEffect(() => {
    setClientSecret(null);
    setError(null);
  }, [tier]);

  const online = (enabled?.[tier] ?? false) && Boolean(PUBLISHABLE) && Boolean(stripePromise);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const enquireHref = `mailto:hello@saabai.ai?subject=${encodeURIComponent(`${t.name} Blueprint enquiry`)}&body=${encodeURIComponent(
    `Hi Shane,\n\nI'd like to get a ${t.name} Blueprint (${t.priceLabel}).\n\nName: ${form.name}\nBusiness: ${form.business}\nPhone: ${form.phone}\nWebsite: ${form.website}\n\nThanks`,
  )}`;

  const startPayment = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ tier, ...form, ui_mode: "embedded" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.clientSecret) {
        setClientSecret(d.clientSecret);
        setBusy(false);
        // Scroll payment into view on mobile after mount.
        requestAnimationFrame(() => {
          document.getElementById("blueprint-pay")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }
      if (d.fallback) setEnabled((p) => (p ? { ...p, [tier]: false } : p));
      setError(d.error || "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  const fetchClientSecret = useCallback(async () => {
    if (!clientSecret) throw new Error("Missing client secret");
    return clientSecret;
  }, [clientSecret]);

  return (
    <div className="sb">
      <SbNav minimal right={<span className="dim" style={{ fontSize: 14 }}>Secure checkout</span>} />
      <div className="wrap">
        <div className="lay">
          <div>
            <div className="steps">
              <b>1 Details</b>›<b className={clientSecret ? "" : "dim"} style={clientSecret ? { color: "var(--teal)" } : undefined}>2 Payment</b>›
              <span>3 Fact-find</span>
            </div>
            <h2 style={{ marginTop: 14, fontSize: 34 }}>Get your Saabai Blueprint</h2>
            <p className="dim" style={{ marginTop: 10, fontSize: 15, maxWidth: 560 }}>
              Pay on this page by card, Apple Pay or Google Pay. Your tax invoice is emailed the moment payment clears.
            </p>

            <form onSubmit={startPayment}>
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
                      disabled={busy}
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

              <div className="card" style={{ marginTop: 20 }}>
                <h3>Your details</h3>
                <div className="f2">
                  <div className="fld">
                    <label htmlFor="name">Full name</label>
                    <input id="name" required autoComplete="name" value={form.name} onChange={set("name")} disabled={busy || Boolean(clientSecret)} />
                  </div>
                  <div className="fld">
                    <label htmlFor="email">Work email</label>
                    <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} disabled={busy || Boolean(clientSecret)} />
                  </div>
                </div>
                <div className="f2">
                  <div className="fld">
                    <label htmlFor="business">Business name</label>
                    <input id="business" required autoComplete="organization" value={form.business} onChange={set("business")} disabled={busy || Boolean(clientSecret)} />
                  </div>
                  <div className="fld">
                    <label htmlFor="phone">Phone (optional)</label>
                    <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} disabled={busy || Boolean(clientSecret)} />
                  </div>
                </div>
                <div className="f2">
                  <div className="fld">
                    <label htmlFor="website">Website (optional)</label>
                    <input id="website" inputMode="url" placeholder="yourbusiness.com.au" value={form.website} onChange={set("website")} disabled={busy || Boolean(clientSecret)} />
                  </div>
                  <div className="fld">
                    <label htmlFor="abn">ABN (optional, for your tax invoice)</label>
                    <input id="abn" inputMode="numeric" placeholder="12 345 678 901" value={form.abn} onChange={set("abn")} disabled={busy || Boolean(clientSecret)} />
                  </div>
                </div>
              </div>

              {!clientSecret && (
                <div className="card" style={{ marginTop: 20 }}>
                  <h3>Payment</h3>
                  {enabled === null ? (
                    <p style={{ marginTop: 10 }}>Loading payment options...</p>
                  ) : online ? (
                    <>
                      <p style={{ marginTop: 10, fontSize: 15 }}>
                        Next you will enter card details on this page. Apple Pay and Google Pay appear when your device supports them.
                      </p>
                      <button className="btn full" type="submit" disabled={busy} style={{ marginTop: 22 }}>
                        {busy ? "Preparing secure payment..." : `Continue to pay ${t.priceLabel}`}
                      </button>
                      <ul className="trust">
                        <li>Encrypted by Stripe</li>
                        <li>Card, Apple Pay, Google Pay</li>
                        <li>Tax invoice emailed instantly</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p style={{ marginTop: 10, fontSize: 15 }}>
                        Online payment is coming soon. Send us your details and Shane will reply within one business day with a secure payment link.
                      </p>
                      <button className="btn full" type="submit" style={{ marginTop: 22 }}>
                        Enquire about {t.name} Blueprint
                      </button>
                      <a className="btn ghost full" href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>
                        Or book a quick call
                      </a>
                    </>
                  )}
                  {error && (
                    <div className="err" role="alert">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </form>

            {clientSecret && stripePromise && (
              <div className="card" id="blueprint-pay" style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>Pay {t.priceLabel}</h3>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      setClientSecret(null);
                      setError(null);
                    }}
                  >
                    Edit details
                  </button>
                </div>
                <p className="dim" style={{ marginTop: 10, fontSize: 14 }}>
                  Complete payment below. You stay on saabai.ai the whole time.
                </p>
                <div className="embed" style={{ marginTop: 16 }}>
                  <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
                <ul className="trust">
                  <li>Encrypted by Stripe</li>
                  <li>Card, Apple Pay, Google Pay</li>
                  <li>Tax invoice emailed instantly</li>
                </ul>
                {error && (
                  <div className="err" role="alert">
                    {error}
                  </div>
                )}
              </div>
            )}
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
              <span>Includes GST</span>
              <b>{aud(gstOf(t.price), true)}</b>
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
              <b style={{ color: "var(--teal)" }}>30 day build credit.</b> Book any Saabai build within 30 days of delivery and the full {t.priceLabel} comes off your build.
            </div>
            <ul className="trust" style={{ marginTop: 16 }}>
              <li>Australian business</li>
              <li>Secure Stripe payments</li>
              <li>Cancel anytime before paying</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
