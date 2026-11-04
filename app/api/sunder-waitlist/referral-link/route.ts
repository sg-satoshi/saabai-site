import { NextRequest } from "next/server";

// "Check my referrals". Public (proxy.ts, /api/sunder-waitlist prefix) and rate
// limited per IP in lib/form-guard.ts; per email by the daily idempotency key in
// sendSunderReferralLink. Always the same answer, so it never reveals who is on the list.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
const NEUTRAL = "If you're on the list, we've emailed your link.";

export async function POST(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > 1024) return Response.json({ error: "Too large" }, { status: 413, headers: NO_STORE });
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* neutral */ }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const bot = typeof body.website === "string" && body.website.trim() !== "";
  if (!bot && email.length <= 254 && EMAIL.test(email)) {
    try {
      const { sendSunderReferralLink } = await import("../../../../lib/email/ops");
      await sendSunderReferralLink(email);
    } catch (e) {
      console.error("sunder referral link failed:", e instanceof Error ? e.message : "error");
    }
  }
  return Response.json({ ok: true, message: NEUTRAL }, { headers: NO_STORE });
}
