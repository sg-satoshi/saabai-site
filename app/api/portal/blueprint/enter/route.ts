/**
 * GET /api/portal/blueprint/enter?session_id=cs_...
 * Post-payment landing: the buyer just paid, so the Stripe Checkout Session id
 * (unguessable, only in their browser URL) proves it. We verify it is paid,
 * find the engagement it created, sign them in and drop them at the start of
 * the fact-find. If the Stripe webhook has not created the engagement yet we
 * send them to the sign-in page with a friendly note.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { portalAllowed, portalEnabled } from "../../../../../lib/portal-blueprint/flag";
import { BP_COOKIE, bpCookieOptions, signBpSession } from "../../../../../lib/portal-blueprint/session";
import { findEngagementsByEmail } from "../../../../../lib/audit-store";
import { notFound } from "../../../../../lib/portal-blueprint/api";
import { recordLogin } from "../../../../../lib/portal-blueprint/store";
import { portalBaseUrl } from "../../../../../lib/portal-blueprint/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!portalEnabled()) return notFound();
  const base = portalBaseUrl(req);
  const to = (path: string) => NextResponse.redirect(`${base}${path}`, 303);
  const sid = new URL(req.url).searchParams.get("session_id") || "";
  const key = process.env.STRIPE_SECRET_KEY;
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid) || !key) return to("/portal/login");
  try {
    const s = await new Stripe(key).checkout.sessions.retrieve(sid);
    const email = (s.customer_details?.email || s.customer_email || "").trim().toLowerCase();
    if (s.payment_status !== "paid" || !email || !portalAllowed(email)) return to("/portal/login");
    const eng = (await findEngagementsByEmail(email)).find((e) => e.stripeRef === s.id);
    if (!eng) return to("/portal/login?notice=setting-up");
    const res = to(`/portal/${eng.id}/factfind`);
    res.cookies.set(BP_COOKIE, signBpSession(email), bpCookieOptions());
    await recordLogin(eng.id);
    return res;
  } catch (err) {
    console.error("[blueprint-portal] enter failed", err instanceof Error ? err.message : err);
    return to("/portal/login");
  }
}
