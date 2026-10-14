/**
 * POST /api/admin/coupons/setup-products  admin action, idempotent.
 * Finds or creates one fixed Stripe product per care plan (Presence, Growth,
 * Signature) so product-restricted codes can match care plan checkouts.
 * Running it twice changes nothing the second time.
 */
import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { ensureCareProducts } from "../../../../../lib/coupons/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const products = await ensureCareProducts();
    return NextResponse.json({ ok: true, products });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/coupons setup-products]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
