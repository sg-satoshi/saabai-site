/**
 * GET /api/admin/billing-clients/:id/lines   saved price lines
 * PUT /api/admin/billing-clients/:id/lines   { lines: [...] } replace the saved lines
 * Full admins only. Saving lines moves no money and makes no Stripe calls.
 */
import { NextRequest, NextResponse } from "next/server";
import { moneyAdmin } from "../../../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../../../lib/billing/audit-log";
import { getBillingClient } from "../../../../../../lib/billing/clients";
import { getPriceLines, savePriceLines, validateLine, type PriceLine } from "../../../../../../lib/billing/price-lines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await moneyAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getBillingClient((await ctx.params).id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lines: await getPriceLines(client.id) });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const actor = await moneyAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getBillingClient((await ctx.params).id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.lines) || body.lines.length > 100) return NextResponse.json({ error: "lines must be a list (up to 100)" }, { status: 400 });
  const lines: PriceLine[] = [];
  for (const [i, raw] of (body.lines as unknown[]).entries()) {
    const { line, error } = validateLine(raw);
    if (!line) return NextResponse.json({ error: `Line ${i + 1}: ${error}` }, { status: 400 });
    lines.push(line);
  }
  await savePriceLines(client.id, lines);
  await logMoneyAction({ actor, action: "pricing.save", clientId: client.id, clientEmail: client.email, ok: true, note: `${lines.length} price lines` });
  return NextResponse.json({ lines });
}
