import Stripe from "stripe";
import GaEvent from "../../components/GaEvent";
import MarketingPurchase from "../../components/MarketingPurchase";
import { purchaseEventFromSession } from "@/lib/marketing/purchase";

export const metadata = { title: "Payment set up | Saabai" };

async function websitePurchase(sessionId: string | undefined) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!sessionId || !key || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    const session = await new Stripe(key).checkout.sessions.retrieve(sessionId);
    const purchase = purchaseEventFromSession(session);
    if (!purchase || purchase.contentCategory !== "website") return null;
    return purchase;
  } catch (err) {
    console.error("[pay/done]", err);
    return null;
  }
}

export default async function PayDone({ searchParams }: { searchParams: Promise<{ site?: string; session_id?: string }> }) {
  const { site, session_id: sessionId } = await searchParams;
  const purchase = await websitePurchase(sessionId);
  return (
    <>
    <GaEvent name="purchase" onceKey={`careplan:${site || "unknown"}`} params={{ currency: "AUD", items: [{ item_id: "care_plan", item_name: "Website care plan", item_category: "care_plan", quantity: 1 }], payment_type: "care_plan_setup" }} />
    {purchase ? (
      <MarketingPurchase eventId={purchase.eventId} transactionId={purchase.transactionId} value={purchase.value} contentName={purchase.contentName} contentId={purchase.contentIds[0] || "care_plan"} contentCategory="website" />
    ) : null}
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f5f9", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #dfe2ea", borderRadius: 14, maxWidth: 440, padding: 28, color: "#13152a" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 10px" }}>You&apos;re all set</h1>
        <p style={{ margin: "0 0 10px", lineHeight: 1.6, color: "#5f6580" }}>
          Payment is set up{site ? ` for ${site}` : ""}. A receipt is on its way from Stripe. We&apos;ll take it from here.
        </p>
        <a href="/client-portal" style={{ color: "#0e7482", fontWeight: 600 }}>Open your client portal</a>
      </div>
    </main>
    </>
  );
}
