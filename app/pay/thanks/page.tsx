import Link from "next/link";

export const metadata = { title: "Thank you | Saabai", robots: { index: false, follow: false } };

export default async function PayThanks({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const cancelled = status === "cancelled";
  const success = status === "success";
  const heading = cancelled ? "Payment not completed" : "Thank you";
  const body = cancelled
    ? "No payment was taken. If you still want to pay, reply to the payment email and we'll send a fresh link."
    : success
      ? "Your payment is through. You'll get a confirmation by email, and we'll be in touch shortly."
      : "Thanks. If your payment went through, you'll get a confirmation by email.";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f5f9", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #dfe2ea", borderRadius: 14, maxWidth: 440, padding: 28, color: "#13152a" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 10px" }}>{heading}</h1>
        <p style={{ margin: "0 0 10px", lineHeight: 1.6, color: "#5f6580" }}>{body}</p>
        <Link href="/" style={{ color: "#0e7482", fontWeight: 600 }}>Back to saabai.ai</Link>
      </div>
    </main>
  );
}
