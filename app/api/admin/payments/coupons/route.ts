/**
 * GET /api/admin/payments/coupons — coupon codes for the Payments picker.
 * Admin-only, like every other money route (restricted staff get 403 and the picker hides itself;
 * manual code entry stays). Signed-out callers get 401.
 * Returns only code, label, state and start time. Never customer data or Stripe ids beyond the promo id.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "../../../../../lib/stripe";
import { moneyAdmin, moneyDeny } from "../../../../../lib/billing/money-auth";
import { pickerItems, type PickerPromo } from "../../../../../lib/coupons/picker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await moneyAdmin())) return moneyDeny();
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
