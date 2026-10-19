/**
 * GET  /api/admin/coupons  list promotion codes (with their coupon) + product picker status
 * POST /api/admin/coupons  create a coupon + customer-facing promotion code
 * Admin-only. Codes live in Stripe; Stripe Checkout enforces every rule.
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { isAdminRequest } from "../../../../lib/product-stripe";
import { buildStripeParams, codeStartsAt, isOncePerCustomer, parseCouponInput, targetsFromMetadata } from "../../../../lib/coupons/core";
import { targetStatuses } from "../../../../lib/coupons/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const stripe = getStripe();
    const all: Stripe.PromotionCode[] = [];
    for await (const pc of stripe.promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon"] })) {
      all.push(pc);
      if (all.length >= 500) break;
    }
    const codes = all.map((pc) => {
      const c = pc.promotion.coupon as Stripe.Coupon;
      const restrictedProducts = c?.applies_to?.products ?? [];
      const meta = { ...(c?.metadata ?? {}), ...(pc.metadata ?? {}) } as Record<string, string>;
      const covered = targetsFromMetadata(meta, restrictedProducts);
      return {
        id: pc.id,
        code: pc.code,
        active: pc.active,
        timesRedeemed: pc.times_redeemed,
        maxRedemptions: pc.max_redemptions ?? null,
        expiresAt: pc.expires_at ?? null,
        startsAt: codeStartsAt(meta),
        percentOff: c?.percent_off ?? null,
        amountOff: c?.amount_off ?? null,
        duration: c?.duration ?? "once",
        durationMonths: c?.duration_in_months ?? null,
        restrictedProducts,
        /** Picker targets this code covers; empty = all products (or see unknownProducts). */
        targets: covered.targets,
        unknownProducts: covered.unknownProducts,
        target: (pc.metadata?.target as string) || (c?.metadata?.target as string) || (c?.applies_to?.products?.length ? "product" : "all"),
        oncePerCustomer: isOncePerCustomer(meta),
        firstTimeOnly: !!pc.restrictions?.first_time_transaction,
        minimumSpend: pc.restrictions?.minimum_amount ?? null,
        created: pc.created,
      };
    });
    const targets = await targetStatuses().catch(() => []);
    return NextResponse.json({ codes, targets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/coupons GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const input = parseCouponInput(body ?? {});
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    const stripe = getStripe();
    const productIds: string[] = [];
    if (input.targets.length) {
      const statuses = await targetStatuses();
      const notReady: string[] = [];
      for (const id of input.targets) {
        const t = statuses.find((x) => x.id === id);
        if (!t?.ready || !t.productId) notReady.push(`${t?.label ?? id} (${t?.note ?? "not linked to Stripe"})`);
        else productIds.push(t.productId);
      }
      if (notReady.length) return NextResponse.json({ error: `Not ready: ${notReady.join("; ")}` }, { status: 400 });
    }
    const existing = await stripe.promotionCodes.list({ code: input.code, active: true, limit: 1 });
    if (existing.data.length) return NextResponse.json({ error: `${input.code} already exists and is active` }, { status: 409 });
    const p = buildStripeParams(input, productIds);
    const coupon = await stripe.coupons.create(p.coupon as unknown as Stripe.CouponCreateParams);
    try {
      const promo = await stripe.promotionCodes.create({ ...(p.promo as object), promotion: { type: "coupon", coupon: coupon.id } } as Stripe.PromotionCodeCreateParams);
      return NextResponse.json({ id: promo.id, code: promo.code });
    } catch (e) {
      await stripe.coupons.del(coupon.id).catch(() => {}); // don't leave an orphan coupon behind
      throw e;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/coupons POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
