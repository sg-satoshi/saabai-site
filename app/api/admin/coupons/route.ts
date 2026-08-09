/**
 * GET  /api/admin/coupons  — list promotion codes (with their coupon)
 * POST /api/admin/coupons  — create a coupon + customer-facing promotion code
 * Admin-only. Backed entirely by Stripe (no local storage).
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { getProduct } from "../../../../lib/product-catalogue";
import { isAdminRequest } from "../../../../lib/product-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const stripe = getStripe();
    const list = await stripe.promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon"] });
    const codes = list.data.map((pc) => {
      const c = pc.promotion.coupon as Stripe.Coupon;
      return {
        id: pc.id,
        code: pc.code,
        active: pc.active,
        timesRedeemed: pc.times_redeemed,
        maxRedemptions: pc.max_redemptions ?? null,
        expiresAt: pc.expires_at ?? null,
        percentOff: c.percent_off ?? null,
        amountOff: c.amount_off ?? null,
        currency: c.currency ?? null,
        duration: c.duration,
        durationMonths: c.duration_in_months ?? null,
        restrictedProducts: c.applies_to?.products ?? [],
      };
    });
    return NextResponse.json({ codes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/coupons GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ error: "A code is required" }, { status: 400 });

  const kind = body?.kind === "fixed" ? "fixed" : "percent";
  const value = typeof body?.value === "number" ? body.value : parseFloat(String(body?.value));
  if (!value || Number.isNaN(value) || value <= 0) {
    return NextResponse.json({ error: "Discount value must be greater than zero" }, { status: 400 });
  }
  if (kind === "percent" && value > 100) {
    return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 400 });
  }

  const duration: "once" | "forever" | "repeating" =
    body?.duration === "forever" ? "forever" : body?.duration === "repeating" ? "repeating" : "once";

  try {
    const stripe = getStripe();

    const couponParams: Stripe.CouponCreateParams = { duration, name: code };
    if (kind === "percent") {
      couponParams.percent_off = value;
    } else {
      couponParams.amount_off = Math.round(value * 100);
      couponParams.currency = "aud";
    }
    if (duration === "repeating") {
      const months = parseInt(String(body?.durationMonths), 10);
      couponParams.duration_in_months = !months || months < 1 ? 1 : months;
    }
    if (body?.productId) {
      const product = await getProduct(String(body.productId));
      if (product) couponParams.applies_to = { products: [product.stripeProductId] };
    }

    const coupon = await stripe.coupons.create(couponParams);

    const promoParams: Stripe.PromotionCodeCreateParams = {
      code,
      promotion: { type: "coupon", coupon: coupon.id },
    };
    const maxRedemptions = parseInt(String(body?.maxRedemptions), 10);
    if (maxRedemptions && maxRedemptions > 0) promoParams.max_redemptions = maxRedemptions;
    if (typeof body?.expiresAt === "string" && body.expiresAt.trim()) {
      const ts = Math.floor(new Date(body.expiresAt.trim() + "T23:59:59").getTime() / 1000);
      if (!Number.isNaN(ts)) promoParams.expires_at = ts;
    }

    const promo = await stripe.promotionCodes.create(promoParams);

    return NextResponse.json({ id: promo.id, code: promo.code });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/coupons POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
