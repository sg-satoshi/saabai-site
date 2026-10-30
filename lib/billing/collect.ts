/**
 * Take payment from a client's saved price lines (Phase B). Five ways:
 *  invoice              emailed Stripe invoice (one-off lines)
 *  subscription_invoice subscription billed by emailed invoice (recurring lines, one-offs added to the first invoice)
 *  checkout_link        Checkout link, emailed to the client by us
 *  card_now             Checkout opened by the admin with the client present (card on the spot)
 *  saved_card           charge the customer's saved card (off session)
 * Every Stripe create carries an idempotency key from the submission's requestId.
 * No GST is added: amounts are charged as entered.
 */
import type Stripe from "stripe";
import type { BillingClient } from "./clients";
import { stepKey } from "./idempotency";
import { billedUnit, customProductId, ensureCustomProduct, ensurePrice, gstNote, lineTotals, type PriceLine } from "./price-lines";

export const COLLECT_METHODS = ["invoice", "subscription_invoice", "checkout_link", "card_now", "saved_card"] as const;
export type CollectMethod = (typeof COLLECT_METHODS)[number];

export const SITE = "https://www.saabai.ai";

export function isCollectMethod(v: unknown): v is CollectMethod {
  return typeof v === "string" && (COLLECT_METHODS as readonly string[]).includes(v);
}

/** Check the chosen lines suit the method. Returns the error, or the recurring interval (if any) and total. */
export function planCollection(lines: PriceLine[], method: CollectMethod): { error?: string; interval?: PriceLine["interval"]; totalCents: number; recurring: PriceLine[]; once: PriceLine[] } {
  const recurring = lines.filter((l) => l.interval !== "once");
  const once = lines.filter((l) => l.interval === "once");
  const totalCents = lines.reduce((s, l) => s + lineTotals(l).net, 0);
  const base = { totalCents, recurring, once };
  if (!lines.length) return { ...base, error: "Pick at least one price line" };
  if (lines.some((l) => lineTotals(l).net < 50)) return { ...base, error: "Each line must come to at least $0.50 after discount" };
  const intervals = new Set(recurring.map((l) => l.interval));
  if (intervals.size > 1) return { ...base, error: "Recurring lines must share one billing interval" };
  const interval = recurring[0]?.interval;
  if (method === "invoice" && recurring.length) return { ...base, error: "An invoice takes one-off lines only. Use a subscription for recurring lines" };
  if (method === "subscription_invoice" && !recurring.length) return { ...base, error: "A subscription needs at least one recurring line" };
  return { ...base, interval };
}

export interface CollectResult {
  stripeIds: Record<string, string>;
  amountCents: number;
  url?: string;
  emailed?: boolean;
  status?: string;
  note: string;
}

type Resolved = { line: PriceLine; priceId: string; quantity: number; description: string };

async function resolvePrices(stripe: Stripe, client: BillingClient, lines: PriceLine[], idemBase: string): Promise<Resolved[]> {
  let customProduct: string | null = null;
  const out: Resolved[] = [];
  for (const line of lines) {
    const unit = billedUnit(line);
    let productId = line.stripeProductId;
    if (!productId) {
      customProduct ??= await ensureCustomProduct(stripe, client, stepKey(idemBase, "custom-product"));
      productId = customProduct || customProductId(client.id);
    }
    const candidate = line.source === "stripe" ? line.refId : undefined;
    const { priceId } = await ensurePrice(stripe, { productId, unitAmount: unit.unitAmount, interval: line.interval, candidatePriceId: candidate, clientId: client.id, idemKey: stepKey(idemBase, `price-${line.id}`) });
    out.push({ line, priceId, quantity: unit.quantity, description: unit.description });
  }
  return out;
}

function meta(client: BillingClient, method: CollectMethod, lines: PriceLine[]): Record<string, string> {
  return { source: "saabai-admin-pricing", saabai_client_id: client.id, collect_method: method, price_lines: lines.map((l) => l.id).join(",").slice(0, 480), gst: gstNote("none") };
}

/** Pick the saved card for off-session charges: the invoice default, else the newest card. */
export async function savedCard(stripe: Stripe, customerId: string): Promise<string | null> {
  const cus = await stripe.customers.retrieve(customerId);
  if ((cus as { deleted?: boolean }).deleted) return null;
  const def = (cus as Stripe.Customer).invoice_settings?.default_payment_method;
  if (def) return typeof def === "string" ? def : def.id;
  const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
  return pms.data[0]?.id ?? null;
}

export async function collect(
  stripe: Stripe,
  opts: { client: BillingClient; customerId: string; lines: PriceLine[]; method: CollectMethod; idemBase: string; daysUntilDue?: number; sendEmail?: (to: string, url: string, totalCents: number) => Promise<boolean> },
): Promise<CollectResult> {
  const { client, customerId, lines, method, idemBase } = opts;
  const plan = planCollection(lines, method);
  if (plan.error) throw new CollectError(plan.error);
  const days = Number.isFinite(opts.daysUntilDue) ? Math.min(90, Math.max(0, Math.round(opts.daysUntilDue!))) : 7;
  const md = meta(client, method, lines);
  const items = await resolvePrices(stripe, client, lines, idemBase);
  const rec = items.filter((i) => i.line.interval !== "once");
  const one = items.filter((i) => i.line.interval === "once");

  if (method === "invoice") {
    const inv = await stripe.invoices.create({ customer: customerId, collection_method: "send_invoice", days_until_due: days, auto_advance: false, metadata: md }, { idempotencyKey: stepKey(idemBase, "invoice") });
    for (const i of one) {
      // The client pins API version 2024-12-18.acacia, where invoice items take `price` (newer SDK types call it pricing.price).
      const itemParams = { customer: customerId, invoice: inv.id, price: i.priceId, quantity: i.quantity, description: i.description, metadata: md } as unknown as Stripe.InvoiceItemCreateParams;
      await stripe.invoiceItems.create(itemParams, { idempotencyKey: stepKey(idemBase, `item-${i.line.id}`) });
    }
    const fin = await stripe.invoices.finalizeInvoice(inv.id, {}, { idempotencyKey: stepKey(idemBase, "finalize") });
    const sent = await stripe.invoices.sendInvoice(fin.id, {}, { idempotencyKey: stepKey(idemBase, "send") });
    return { stripeIds: { invoice: sent.id, customer: customerId }, amountCents: sent.amount_due, url: sent.hosted_invoice_url || undefined, emailed: true, status: sent.status || undefined, note: "Stripe emailed the invoice" };
  }

  if (method === "subscription_invoice" || (method === "saved_card" && rec.length)) {
    let pm: string | null = null;
    if (method === "saved_card") {
      pm = await savedCard(stripe, customerId);
      if (!pm) throw new CollectError("This client has no saved card. Send a Checkout link instead");
    }
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: rec.map((i) => ({ price: i.priceId, quantity: i.quantity })),
      add_invoice_items: one.map((i) => ({ price: i.priceId, quantity: i.quantity })),
      ...(method === "subscription_invoice" ? { collection_method: "send_invoice" as const, days_until_due: days } : { collection_method: "charge_automatically" as const, default_payment_method: pm!, off_session: true }),
      metadata: md,
    }, { idempotencyKey: stepKey(idemBase, "subscription") });
    return { stripeIds: { subscription: sub.id, customer: customerId }, amountCents: plan.totalCents, status: sub.status, emailed: method === "subscription_invoice", note: method === "subscription_invoice" ? "Subscription started, billed by emailed invoice" : "Subscription started on the saved card" };
  }

  if (method === "saved_card") {
    const pm = await savedCard(stripe, customerId);
    if (!pm) throw new CollectError("This client has no saved card. Send a Checkout link instead");
    const pi = await stripe.paymentIntents.create({
      amount: plan.totalCents, currency: "aud", customer: customerId, payment_method: pm, off_session: true, confirm: true,
      description: one.map((i) => i.description).join("; ").slice(0, 500), metadata: md,
    }, { idempotencyKey: stepKey(idemBase, "pi") });
    return { stripeIds: { payment_intent: pi.id, customer: customerId }, amountCents: pi.amount, status: pi.status, note: "Charged the saved card" };
  }

  // checkout_link / card_now
  const session = await stripe.checkout.sessions.create({
    mode: rec.length ? "subscription" : "payment",
    customer: customerId,
    line_items: items.map((i) => ({ price: i.priceId, quantity: i.quantity })),
    success_url: `${SITE}/pay/thanks?status=success`,
    cancel_url: `${SITE}/pay/thanks?status=cancelled`,
    metadata: md,
    ...(rec.length ? { subscription_data: { metadata: md } } : { payment_intent_data: { metadata: md }, invoice_creation: { enabled: true } }),
  }, { idempotencyKey: stepKey(idemBase, "checkout") });
  let emailed = false;
  if (method === "checkout_link" && session.url && opts.sendEmail) emailed = await opts.sendEmail(client.email, session.url, plan.totalCents);
  return {
    stripeIds: { checkout_session: session.id, customer: customerId }, amountCents: plan.totalCents, url: session.url || undefined, emailed,
    note: method === "card_now" ? "Checkout opened for card on the spot" : emailed ? "Checkout link emailed" : "Checkout link created (email not sent, copy the link)",
  };
}

export class CollectError extends Error {}
