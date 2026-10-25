/**
 * GET /api/admin/payments/coupons — coupon codes for the Payments picker.
 * The proxy already requires billing read for this path. Coupon data is a separate area, so the
 * handler also requires coupons read; without it the picker gets 403 and hides itself (manual entry stays).
 * Returns only code, label, state and start time. Never customer data or Stripe ids beyond the promo id.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { cookies } from "next/headers";
import { getStripe } from "../../../../../lib/stripe";
import { levelFor } from "../../../../../lib/access";
import { COOKIE_NAME, resolveStaff, verifySessionToken } from "../../../../../lib/auth";
import { pickerItems, type PickerPromo } from "../../../../../lib/coupons/picker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const staff = session ? await resolveStaff(session.clientId) : null;
  if (!staff || levelFor(staff.grant, "billing") === "none" || levelFor(staff.grant, "coupons") === "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const all: Stripe.PromotionCode[] = [];
    for await (const pc of getStripe().promotionCodes.list({ active: true, limit: 100, expand: ["data.promotion.coupon"] })) {
      all.push(pc);
      if (all.length >= 500) break;
    }
    return NextResponse.json({ items: pickerItems(all as unknown as PickerPromo[]) });
  } catch (err) {
    console.error("[payments/coupons GET]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Couldn't load coupons" }, { status: 500 });
  }
}
