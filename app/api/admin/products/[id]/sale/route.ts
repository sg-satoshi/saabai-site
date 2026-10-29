/**
 * Sale price for one catalogue product. Admin only. Writes the `sale` field to the
 * product record and nothing else: no Stripe calls, no price changes.
 *   PUT    { salePrice, saleStartsAt?, saleEndsAt?, showCountdown?, publicSlot? }
 *   POST   { action: "end" }  ends the sale now (kept for the record as Ended)
 *   DELETE                    removes the sale
 */
import { NextRequest, NextResponse } from "next/server";
import { getProduct, saveProduct } from "../../../../../../lib/product-catalogue";
import { isAdminRequest } from "../../../../../../lib/product-stripe";
import { basePriceCents, parseSaleInput } from "../../../../../../lib/sale-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  if (!(await isAdminRequest())) return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const { id } = await ctx.params;
  const product = await getProduct(id);
  if (!product) return { res: NextResponse.json({ error: "Product not found" }, { status: 404 }) };
  return { product };
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { res, product } = await load(ctx);
  if (res) return res;
  const body = await req.json().catch(() => null);
  const { sale, error } = parseSaleInput(body, basePriceCents(product!));
  if (error) return NextResponse.json({ error }, { status: 400 });
  const updated = { ...product!, sale: sale ?? null, updatedAt: new Date().toISOString() };
  await saveProduct(updated);
  return NextResponse.json({ product: updated });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { res, product } = await load(ctx);
  if (res) return res;
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "end") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (!product!.sale) return NextResponse.json({ error: "No sale on this product" }, { status: 409 });
  const now = new Date();
  const start = Date.parse(product!.sale.saleStartsAt);
  const sale = {
    ...product!.sale,
    // A scheduled sale that never started is ended at its own start so it never goes live.
    saleStartsAt: start > now.getTime() ? now.toISOString() : product!.sale.saleStartsAt,
    saleEndsAt: now.toISOString(),
  };
  if (Date.parse(sale.saleStartsAt) >= Date.parse(sale.saleEndsAt)) sale.saleStartsAt = new Date(now.getTime() - 1000).toISOString();
  const updated = { ...product!, sale, updatedAt: now.toISOString() };
  await saveProduct(updated);
  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { res, product } = await load(ctx);
  if (res) return res;
  const updated = { ...product!, sale: null, updatedAt: new Date().toISOString() };
  await saveProduct(updated);
  return NextResponse.json({ product: updated });
}
