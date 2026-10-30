/**
 * GET /api/admin/payments/products       picker items: site catalogue + Stripe prices (read at runtime)
 *     ?all=1 includes items not switched on for payments (for the settings list)
 * PUT /api/admin/payments/products       { key, enabled } toggles "available in payments"
 * Full admins only. Reads Stripe, never writes to it.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import { moneyAdmin } from "../../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../../lib/billing/audit-log";
import { listProducts } from "../../../../../lib/product-catalogue";
import { catalogueItems, getEnabledKeys, setPickerEnabled, stripeItems, validPickerKey } from "../../../../../lib/billing/picker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await moneyAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const all = req.nextUrl.searchParams.get("all") === "1";
  const enabled = await getEnabledKeys();
  const cat = catalogueItems(await listProducts(), enabled);
  let stripe: ReturnType<typeof stripeItems> = [];
  let stripeError: string | undefined;
  try {
    const prices = await getStripe().prices.list({ active: true, limit: 100, expand: ["data.product"] });
    stripe = stripeItems(prices.data as never, enabled);
  } catch (err) {
    stripeError = err instanceof Error ? err.message : String(err);
  }
  const items = [...cat, ...stripe].filter((i) => all || i.enabled);
  return NextResponse.json({ items, stripeError });
}

export async function PUT(req: NextRequest) {
  const actor = await moneyAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!validPickerKey(body?.key)) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  await setPickerEnabled(body.key, !!body.enabled);
  await logMoneyAction({ actor, action: "picker.toggle", productId: body.key, ok: true, note: body.enabled ? "available in payments" : "hidden from payments" });
  return NextResponse.json({ ok: true });
}
