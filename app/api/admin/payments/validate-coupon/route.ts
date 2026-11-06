/**
 * POST /api/admin/payments/validate-coupon — validate a coupon for a manual
 * charge and preview the discounted amount. Admin-only.
 * Body: { code: string, amount?: number (cents) }
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { moneyAdmin, moneyDeny } from "../../../../../lib/billing/money-auth";
import { resolveCouponForManual, couponOff } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Money route: full admins only (restricted staff are refused).
  if (!(await moneyAdmin())) {
    return moneyDeny();
  }
  const body = await req.json().catch(() => ({}));

  try {
    const stripe = getStripe();
    const { coupon, error } = await resolveCouponForManual(stripe, body?.code, typeof body?.customerEmail === "string" ? body.customerEmail : undefined);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!coupon) return NextResponse.json({ error: "Enter a coupon code" }, { status: 400 });

    const amount = typeof body?.amount === "number" ? Math.round(body.amount) : null;
    const discounted = amount != null ? couponOff(amount, coupon) : null;

    return NextResponse.json({
      code: coupon.code,
      percentOff: coupon.percentOff,
      amountOff: coupon.amountOff,
      discountedAmount: discounted,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/validate-coupon]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
