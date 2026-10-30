export const metadata = { title: "Thank you | Saabai", robots: { index: false, follow: false } };

export default async function PayThanks({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const cancelled = status === "cancelled";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f5f9", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #dfe2ea", borderRadius: 14, maxWidth: 440, padding: 28, color: "#13152a" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 10px" }}>{cancelled ? "Payment not completed" : "Thank you"}</h1>
        <p style={{ margin: "0 0 10px", lineHeight: 1.6, color: "#5f6580" }}>
          {cancelled
            ? "No payment was taken. You can use the same payment link again whenever you're ready, or reply to our email if you have a question."
            : "Your payment is through. A receipt is on its way from Stripe, and we'll be in touch shortly."}
        </p>
        <a href="/" style={{ color: "#0e7482", fontWeight: 600 }}>Back to saabai.ai</a>
      </div>
    </main>
  );
}
