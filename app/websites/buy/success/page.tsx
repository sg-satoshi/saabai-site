import type { Metadata } from "next";
import Stripe from "stripe";
import SbNav from "../../../components/sb/SbNav";
import "../../../components/sb/checkout.css";
import GaEvent from "../../../components/GaEvent";
import { PRESENCE, PRESENCE_ITEM, orderRef } from "@/lib/website-presence";

export const metadata: Metadata = { title: "Deposit paid: Presence website | Saabai", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function lookup(sessionId: string | undefined) {
  const empty = { name: "", email: "", business: "", paid: false, ref: "", sid: "" };
  const key = process.env.STRIPE_SECRET_KEY;
  if (!sessionId || !key || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return empty;
  try {
    const s = await new Stripe(key).checkout.sessions.retrieve(sessionId);
    if (s.metadata?.product !== "website_presence") return empty;
    return {
      name: (s.customer_details?.name || "").split(" ")[0],
      email: s.customer_details?.email || s.customer_email || "",
      business: s.metadata?.business || "",
      paid: s.payment_status === "paid",
      ref: orderRef(s.id),
      sid: s.id,
    };
  } catch (err) {
    console.error("[websites success]", err);
    return empty;
  }
}

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const o = await lookup(typeof sp.session_id === "string" ? sp.session_id : undefined);
  const q = new URLSearchParams();
  if (o.sid) q.set("session_id", o.sid);
  const onboarding = `/websites/onboarding${q.toString() ? `?${q}` : ""}`;

  return (
    <div className="sb">
      {o.paid && o.ref ? (
        <GaEvent name="purchase" onceKey={`purchase:${o.ref}`} params={{ transaction_id: o.ref, currency: "AUD", value: PRESENCE.deposit, items: [PRESENCE_ITEM] }} />
      ) : null}
      <SbNav minimal right={o.ref ? <span className="dim" style={{ fontSize: 14 }}>Order {o.ref}</span> : undefined} />
      <div style={{ position: "relative" }}>
        <div className="glow" />
        <div className="wrap">
          <div className="cbox">
            <div className="ok">✓</div>
            <span className="eyebrow">{o.paid ? "Deposit paid" : "Order received"}</span>
            <h1 style={{ fontSize: 44, marginTop: 14 }}>
              You&apos;re booked in{o.name ? `, ${o.name}` : ""}. <span className="grad">Let&apos;s build your site.</span>
            </h1>
            <p style={{ fontSize: 17, marginTop: 16 }}>
              Your receipt is on its way{o.email ? ` to ${o.email}` : ""}. Next, tell us about your business so we can start.
            </p>
            <div className="card tl">
              <h3>What happens next</h3>
              <div className="st done"><span className="d">✓</span><div><b>Deposit paid</b><p>${PRESENCE.deposit.toLocaleString("en-AU")} of your ${PRESENCE.build.toLocaleString("en-AU")} Presence build. GST not applicable.</p></div></div>
              <div className="st"><span className="d">2</span><div><b>Onboarding form (about 8 minutes)</b><p>Your business, domain, brand, first pages and chatbot FAQs.</p></div></div>
              <div className="st"><span className="d">3</span><div><b>Build</b><p>{PRESENCE.revisions} rounds of revisions. The ${PRESENCE.balance.toLocaleString("en-AU")} balance is invoiced before go-live, and ${PRESENCE.care}/mo care starts at go-live.</p></div></div>
            </div>
            <a className="btn" href={onboarding} style={{ marginTop: 28, minHeight: 48 }}>Start onboarding form</a>
            <p className="dim" style={{ fontSize: 13, marginTop: 14 }}>Questions? Reply to your receipt or email <a href="mailto:hello@saabai.ai">hello@saabai.ai</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
