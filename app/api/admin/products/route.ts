/**
 * GET  /api/admin/products  — list catalogue products
 * POST /api/admin/products  — create a product (Stripe Product + Price(s) + record)
 * Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { listProducts, saveProduct, buildProduct } from "../../../../lib/product-catalogue";
import {
  isAdminRequest,
  validateProductInput,
  createStripePrices,
} from "../../../../lib/product-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const products = await listProducts();
    return NextResponse.json({ products });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/products GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { input, error } = validateProductInput(body);
  if (error || !input) {
    return NextResponse.json({ error: error ?? "Invalid product" }, { status: 400 });
  }

  try {
    const stripe = getStripe();

    const stripeProduct = await stripe.products.create({
      name: input.name,
      description: input.description || undefined,
      images: input.imageUrl ? [input.imageUrl] : undefined,
      active: input.active,
      metadata: { source: "saabai-catalogue" },
    });

    const priceIds = await createStripePrices(stripe, input, stripeProduct.id);

    const product = buildProduct(input, stripeProduct.id, priceIds);
    await saveProduct(product);

    return NextResponse.json({ product });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/products POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
