/**
 * DELETE /api/admin/coupons/[id]  — deactivate a promotion code (id = promo_...)
 * Admin-only. Promotion codes can't be deleted in Stripe, only deactivated.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { isAdminRequest } from "../../../../../lib/product-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const stripe = getStripe();
    await stripe.promotionCodes.update(id, { active: false });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/coupons DELETE]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
