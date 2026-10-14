import { redirect } from "next/navigation";

// Referral link. proxy.ts records the code in the first-party sb_attr cookie; checkout carries it to Stripe.
export default async function ReferralRedirect({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  redirect(`/blueprint?ref=${encodeURIComponent(code)}`);
}
