/**
 * POST /api/admin/sell/quote — validate an optional coupon + return the live
 * pricing quote for a product (used by the Sell panel to show was/now/save).
 * Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { getProduct } from "../../../../../lib/product-catalogue";
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { resolveCoupon, buildQuote } from "../../../../../lib/sell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const product = await getProduct(String(body?.productId || ""));
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  try {
    const stripe = getStripe();
    const { coupon, error } = await resolveCoupon(stripe, body?.code, product);
    const quote = buildQuote(product, coupon);
    return NextResponse.json({
      quote,
      couponError: error ?? null,
      billingType: product.billingType,
      interval: product.interval ?? null,
      trialDays: product.trialDays ?? null,
      gstInclusive: product.gstInclusive,
      productName: product.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/sell/quote]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
