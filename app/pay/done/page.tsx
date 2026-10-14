import GaEvent from "../../components/GaEvent";

export const metadata = { title: "Payment set up | Saabai" };

export default async function PayDone({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  return (
    <>
    <GaEvent name="purchase" onceKey={`careplan:${site || "unknown"}`} params={{ currency: "AUD", items: [{ item_id: "care_plan", item_name: "Website care plan", item_category: "care_plan", quantity: 1 }], payment_type: "care_plan_setup" }} />
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
