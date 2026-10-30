/**
 * POST /api/admin/billing-clients/:id/collect
 * { method, lineIds, requestId, daysUntilDue? } take payment from the client's saved price lines.
 * Full admins only. Idempotent per requestId. Every attempt is written to the money audit log.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../../../../lib/stripe";
import { moneyAdmin } from "../../../../../../lib/billing/money-auth";
import { logMoneyAction } from "../../../../../../lib/billing/audit-log";
import { cleanRequestId, idemKey } from "../../../../../../lib/billing/idempotency";
import { getBillingClient } from "../../../../../../lib/billing/clients";
import { resolveMoneyCustomer } from "../../../../../../lib/billing/money-customer";
import { getPriceLines } from "../../../../../../lib/billing/price-lines";
import { collect, CollectError, isCollectMethod } from "../../../../../../lib/billing/collect";
import { escapeHtml, renderBrandedEmail, sendBrandedEmail } from "../../../../../../lib/email/branded-layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const aud = (c: number) => `$${(c / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function emailCheckoutLink(to: string, name: string, url: string, totalCents: number): Promise<boolean> {
  const email = renderBrandedEmail({
    subject: "Your Saabai payment link",
    title: `Hi ${name.split(" ")[0] || "there"}`,
    bodyHtml: `<p>Here is your secure payment link for ${escapeHtml(aud(totalCents))} (AUD). GST not applicable.</p>`,
    cta: { href: url, label: "Pay securely" },
    textBody: [`Here is your secure payment link for ${aud(totalCents)} (AUD). GST not applicable.`, url],
  });
  return sendBrandedEmail({ to, email });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await moneyAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getBillingClient((await ctx.params).id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!isCollectMethod(body?.method)) return NextResponse.json({ error: "Unknown payment method" }, { status: 400 });
  const ids = Array.isArray(body?.lineIds) ? (body.lineIds as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const saved = await getPriceLines(client.id);
  const lines = saved.filter((l) => ids.includes(l.id));
  if (!lines.length || lines.length !== new Set(ids).size) return NextResponse.json({ error: "Pick saved price lines for this client" }, { status: 400 });
  // requestId is required: one per form submission, renewed by the browser after an error or a change.
  const requestId = cleanRequestId(body.requestId);
  if (!requestId) return NextResponse.json({ error: "Missing request id. Reload and try again" }, { status: 400 });
  const base = idemKey(`collect-${body.method}`, requestId, { actor, clientId: client.id, ids });
  const action = `collect.${body.method}`;
  try {
    const stripe = getStripe();
    const { customerId } = await resolveMoneyCustomer(stripe, { clientId: client.id, source: "saabai-admin-pricing", idemBase: base });
    if (!customerId) return NextResponse.json({ error: "Customer could not be resolved" }, { status: 400 });
    const result = await collect(stripe, {
      client, customerId, lines, method: body.method, idemBase: base, daysUntilDue: Number(body.daysUntilDue),
      sendEmail: (to, url, total) => emailCheckoutLink(to, client.name, url, total),
    });
    await logMoneyAction({ actor, action, amountCents: result.amountCents, currency: "aud", clientId: client.id, clientEmail: client.email, stripeIds: result.stripeIds, productId: lines.map((l) => l.refId || "custom").join(",").slice(0, 120), ok: true, note: result.note });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logMoneyAction({ actor, action, clientId: client.id, clientEmail: client.email, ok: false, note: msg });
    return NextResponse.json({ error: msg }, { status: err instanceof CollectError ? 400 : 502 });
  }
}
