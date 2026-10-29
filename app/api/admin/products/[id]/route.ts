/**
 * PATCH  /api/admin/products/[id]  — update a product (syncs Stripe; price change
 *                                    = new Stripe price + archive old, since Stripe
 *                                    prices are immutable)
 * DELETE /api/admin/products/[id]  — archive: deactivate in Stripe, remove record
 * Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../lib/stripe";
import type { PriceChange } from "../../../../../lib/sale-price";
import {
  getProduct,
  saveProduct,
  deleteProduct,
  type CatalogueProduct,
} from "../../../../../lib/product-catalogue";
import {
  isAdminRequest,
  validateProductInput,
  createStripePrices,
  archiveStripePrices,
  ensureSetupProduct,
} from "../../../../../lib/product-stripe";

export const runtime = "nodejs";

/** Record regular price changes per fee so the sale guard (Q5) can see them. */
function appendPriceHistory(existing: CatalogueProduct, input: { oneTimeAmount?: number; recurringAmount?: number; setupFee?: number }): PriceChange[] {
  const out = [...(existing.priceHistory || [])];
  const at = new Date().toISOString();
  const pairs: [PriceChange["fee"], number | undefined, number | undefined][] = [
    ["one_time", existing.oneTimeAmount, input.oneTimeAmount],
    ["recurring", existing.recurringAmount, input.recurringAmount],
    ["setup", existing.setupFee, input.setupFee],
  ];
  for (const [fee, from, to] of pairs) {
    if (to != null && to !== from) out.push({ at, fee, fromCents: from ?? null, toCents: to, by: "admin" });
  }
  return out.slice(-50);
}
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await getProduct(id);
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { input, error } = validateProductInput(body);
  if (error || !input) {
    return NextResponse.json({ error: error ?? "Invalid product" }, { status: 400 });
  }

  try {
    const stripe = getStripe();

    // Update the Stripe product metadata
    await stripe.products.update(existing.stripeProductId, {
      name: input.name,
      description: input.description || undefined,
      images: input.imageUrl ? [input.imageUrl] : [],
      active: input.active,
    });

    // Ensure the setup fee has its own Stripe product (backfills existing products
    // on save so setup-scoped coupons can target it).
    let setupProductId = existing.stripeSetupProductId;
    const needsSetupSplit = input.billingType === "setup_monthly" && !setupProductId;
    if (input.billingType === "setup_monthly") {
      setupProductId = await ensureSetupProduct(stripe, input.name, existing.stripeSetupProductId);
    }

    // Stripe prices are immutable — recreate only when pricing changed, or when we
    // just moved the setup fee onto its own product.
    const priceChanged =
      input.billingType !== existing.billingType ||
      input.oneTimeAmount !== existing.oneTimeAmount ||
      input.recurringAmount !== existing.recurringAmount ||
      input.interval !== existing.interval ||
      input.setupFee !== existing.setupFee ||
      input.gstInclusive !== existing.gstInclusive ||
      needsSetupSplit;

    let priceIds = existing.stripePriceIds;
    if (priceChanged) {
      await archiveStripePrices(stripe, existing.stripePriceIds);
      priceIds = await createStripePrices(stripe, input, existing.stripeProductId, setupProductId);
    }

    const updated: CatalogueProduct = {
      id: existing.id,
      ...input,
      sale: existing.sale ?? null, // the sale route owns this; a product save keeps it
      priceHistory: appendPriceHistory(existing, input),
      stripeProductId: existing.stripeProductId,
      stripeSetupProductId: setupProductId,
      stripePriceIds: priceIds,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await saveProduct(updated);

    return NextResponse.json({ product: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/products PATCH]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await getProduct(id);
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  try {
    const stripe = getStripe();
    await archiveStripePrices(stripe, existing.stripePriceIds);
    await stripe.products.update(existing.stripeProductId, { active: false }).catch(() => null);
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/products DELETE]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
