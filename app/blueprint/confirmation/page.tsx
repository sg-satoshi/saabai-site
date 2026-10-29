import type { Metadata } from "next";
import Stripe from "stripe";
import SbNav from "../../components/sb/SbNav";
import "../../components/sb/checkout.css";
import { TIERS, isTier, type BlueprintTier } from "@/lib/blueprint";
import GaEvent from "../../components/GaEvent";
import MarketingPurchase from "../../components/MarketingPurchase";
import MarkConverted from "@/app/components/MarkConverted";

export const metadata: Metadata = { title: "You're in: Saabai Blueprint", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

async function lookup(sessionId: string | undefined): Promise<{ tier: BlueprintTier | null; name: string; email: string; paid: boolean; ref: string; amountAud: number | null; sessionId: string }> {
  const empty = { tier: null, name: "", email: "", paid: false, ref: "", amountAud: null, sessionId: "" };
  const key = process.env.STRIPE_SECRET_KEY;
  if (!sessionId || !key || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return empty;
  try {
    const s = await new Stripe(key).checkout.sessions.retrieve(sessionId);
    const t = s.metadata?.tier;
    return {
      tier: isTier(t) ? t : null,
      name: (s.metadata?.name || s.customer_details?.name || "").split(" ")[0],
      email: s.customer_details?.email || s.customer_email || "",
      paid: s.payment_status === "paid",
      ref: "SB-" + s.id.slice(-6).toUpperCase(),
      amountAud: typeof s.amount_total === "number" ? s.amount_total / 100 : null,
      sessionId: s.id,
    };
  } catch (err) {
    console.error("[blueprint confirmation]", err);
    return empty;
  }
}

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sid = typeof sp.session_id === "string" ? sp.session_id : undefined;
  const o = await lookup(sid);
  const t = o.tier ? TIERS[o.tier] : null;

  return (
    <div className="sb">
      {o.paid && t && o.sessionId && o.amountAud != null ? (
        <MarketingPurchase eventId={`purchase_${o.sessionId}`} transactionId={o.sessionId} value={o.amountAud} contentName={`Saabai Blueprint ${t.name}`} contentId={`blueprint_${o.tier}`} contentCategory="blueprint" />
      ) : o.paid && t && o.ref ? (
        <GaEvent name="purchase" onceKey={`purchase:${o.ref}`} params={{ transaction_id: o.ref, currency: "AUD", value: t.price, items: [{ item_id: `blueprint_${o.tier}`, item_name: `Saabai Blueprint ${t.name}`, item_category: "blueprint", price: t.price, quantity: 1 }] }} />
      ) : null}
      {o.paid ? <MarkConverted /> : null}
      <SbNav minimal right={o.ref ? <span className="dim" style={{ fontSize: 14 }}>Order {o.ref}</span> : undefined} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap">
          <div className="cbox">
            <div className="ok">✓</div>
            <span className="eyebrow">{o.paid ? "Payment received" : "Order received"}</span>
            <h1 style={{ fontSize: 52, marginTop: 14 }}>
              You&apos;re in{o.name ? `, ${o.name}` : ""}. <span className="grad">Let&apos;s build your Blueprint.</span>
            </h1>
            <p style={{ fontSize: 18, marginTop: 16 }}>
              We&apos;ve emailed your invoice and fact-find link{o.email ? ` to ${o.email}` : ""}.
            </p>
            <div className="card tl">
              <h3>What happens next</h3>
              <div className="st done">
                <span className="d">✓</span>
                <div>
                  <b>{t ? `${t.name} Blueprint confirmed` : "Blueprint confirmed"}</b>
                  <p>{t ? `${t.priceLabel} paid. ` : ""}Credited against any build booked within 30 days of delivery.</p>
                </div>
              </div>
              <div className="st">
                <span className="d">2</span>
                <div>
                  <b>Complete your fact-find (about 15 minutes)</b>
                  <p>Tell us about your team, tools and busiest tasks. Your private link is in your inbox. If it hasn&apos;t arrived in 10 minutes, check spam or reply to <a href="mailto:hello@saabai.ai">hello@saabai.ai</a>.</p>
                </div>
              </div>
              {(!t || t.includesCall) && (
                <div className="st">
                  <span className="d">3</span>
                  <div style={{ flex: 1 }}>
                    <b>Book your intake call (Pro and Business)</b>
                    <p>A 30 minute call with Shane to walk through your Blueprint. Times shown in Brisbane time (AEST).</p>
                    <a className="btn ghost sm" href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>Pick a time →</a>
                    <p className="dim" style={{ fontSize: 13, marginTop: 10 }}>Starter orders skip this step: fact-find online, no call.</p>
                  </div>
                </div>
              )}
              <div className="st">
                <span className="d">{!t || t.includesCall ? 4 : 3}</span>
                <div>
                  <b>Receive your Blueprint</b>
                  <p>{t ? `Within ${t.delivery} of your fact-find, as a PDF and in your client portal.` : "Starter within 48 hours, Pro within 3 business days, Business in 2 to 3 weeks. You'll get it as a PDF and in your client portal."}</p>
                </div>
              </div>
            </div>
            <a className="btn ghost" href="/client-portal" style={{ marginTop: 32 }}>Go to my client portal</a>
          </div>
        </div>
      </div>
    </div>
  );
}
