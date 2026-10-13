/**
 * GET /api/admin/orders
 * Unified paid-order feed for Saabai Admin:
 *  - Lex subscriptions (Stripe)
 *  - Blueprint one-off checkouts (Redis engagements + Stripe sessions)
 * Admin-only - requires valid saabai_session cookie.
 */

import Stripe from "stripe";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { listEngagements } from "../../../../lib/audit-store";
import { AUDIT_STATUS_LABELS, type AuditStatus } from "../../../../lib/audit-types";
import { TIERS, isTier } from "../../../../lib/blueprint";
import { classifySubscription, subscriptionOrderKind, subscriptionProductLabel } from "../../../../lib/subscription-classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export interface InvoiceRecord {
  id: string;
  amount: number;
  status: string;
  date: number;
  description: string;
  hostedUrl: string | null;
}

export type OrderKind = "blueprint" | "lex_subscription" | "website_care";

export interface OrderRecord {
  id: string;
  kind: OrderKind;
  productLabel: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  business: string | null;
  website: string | null;
  amountTotal: number | null;
  currency: string;
  status: string;
  statusLabel: string;
  intakeStatus: string | null;
  intakeUrl: string | null;
  stripeUrl: string | null;
  stripeSessionId: string | null;
  paymentIntentId: string | null;
  invoiceUrl: string | null;
  billingAddress: string | null;
  createdAt: number;
  customerId: string | null;
  monthlyAmount: number | null;
  currentPeriodEnd: number | null;
  invoices: InvoiceRecord[];
  engagementId: string | null;
}

function derivePlan(amount: number | null): string {
  if (!amount) return "Starter";
  return amount >= 49900 ? "Growth" : "Starter";
}

function formatAddress(addr: Stripe.Address | null | undefined): string | null {
  if (!addr) return null;
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function blueprintLabel(tierRaw: string | undefined): string {
  if (tierRaw && isTier(tierRaw)) return `Blueprint ${TIERS[tierRaw].name}`;
  return "Blueprint";
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return Response.json({ error: "Stripe not configured" }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });
  const orders: OrderRecord[] = [];

  // ── Blueprint one-offs from Redis engagements ─────────────────────────────
  try {
    const engagements = await listEngagements();
    for (const e of engagements) {
      if (!e.stripeRef && !e.amountTotal) continue; // skip manually created drafts with no payment
      const tierMeta = Object.entries(TIERS).find(([, t]) => t.engineTier === e.tier)?.[0];
      const pi = e.paymentIntentId;
      const stripeUrl = pi
        ? `https://dashboard.stripe.com/payments/${pi}`
        : e.stripeRef
          ? `https://dashboard.stripe.com/search?query=${encodeURIComponent(e.stripeRef)}`
          : null;
      const intakeStatus = e.status as AuditStatus;
      orders.push({
        id: e.id,
        kind: "blueprint",
        productLabel: blueprintLabel(tierMeta),
        name: e.contactName || null,
        email: e.contactEmail || null,
        phone: e.contactPhone || null,
        business: e.firmName || null,
        website: e.website || null,
        amountTotal: e.amountTotal ?? (tierMeta && isTier(tierMeta) ? TIERS[tierMeta].price * 100 : null),
        currency: (e.currency || "AUD").toUpperCase(),
        status: e.status,
        statusLabel: AUDIT_STATUS_LABELS[intakeStatus] ?? e.status,
        intakeStatus: AUDIT_STATUS_LABELS[intakeStatus] ?? e.status,
        intakeUrl: `/saabai-admin/audits/${e.id}`,
        stripeUrl,
        stripeSessionId: e.stripeRef || null,
        paymentIntentId: pi || null,
        invoiceUrl: e.invoiceUrl || null,
        billingAddress: e.billingAddress || null,
        createdAt: Math.floor(new Date(e.createdAt).getTime() / 1000),
        customerId: e.stripeCustomerId || null,
        monthlyAmount: null,
        currentPeriodEnd: null,
        invoices: [],
        engagementId: e.id,
      });
    }
  } catch (err) {
    console.error("[orders] engagements list failed:", err);
  }

  // ── Recent paid Blueprint Checkout Sessions not yet in Redis ──────────────
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 40, status: "complete" });
    const seen = new Set(orders.map((o) => o.stripeSessionId).filter(Boolean));
    for (const s of sessions.data) {
      if (s.metadata?.product !== "blueprint") continue;
      if (s.payment_status !== "paid") continue;
      if (seen.has(s.id)) continue;
      const tier = s.metadata?.tier;
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id || null;
      orders.push({
        id: s.id,
        kind: "blueprint",
        productLabel: blueprintLabel(tier),
        name: s.customer_details?.name || s.metadata?.name || null,
        email: s.customer_details?.email || s.customer_email || null,
        phone: s.customer_details?.phone || s.metadata?.phone || null,
        business: s.metadata?.business || null,
        website: s.metadata?.website || null,
        amountTotal: s.amount_total,
        currency: (s.currency || "aud").toUpperCase(),
        status: "paid_pending_engagement",
        statusLabel: "Paid (engagement missing)",
        intakeStatus: "Not created",
        intakeUrl: null,
        stripeUrl: pi
          ? `https://dashboard.stripe.com/payments/${pi}`
          : `https://dashboard.stripe.com/search?query=${encodeURIComponent(s.id)}`,
        stripeSessionId: s.id,
        paymentIntentId: pi,
        invoiceUrl: null,
        billingAddress: formatAddress(s.customer_details?.address),
        createdAt: s.created,
        customerId: typeof s.customer === "string" ? s.customer : s.customer?.id || null,
        monthlyAmount: null,
        currentPeriodEnd: null,
        invoices: [],
        engagementId: null,
      });
    }
  } catch (err) {
    console.error("[orders] checkout.sessions.list failed:", err);
  }

  // ── Lex subscriptions ─────────────────────────────────────────────────────
  try {
    const subscriptionsRes = await stripe.subscriptions.list({ limit: 100 });
    const customerIds = [
      ...new Set(
        subscriptionsRes.data
          .map((s) => (typeof s.customer === "string" ? s.customer : (s.customer as Stripe.Customer | null)?.id ?? ""))
          .filter(Boolean),
      ),
    ];
    const customerMap: Record<string, Stripe.Customer> = {};
    await Promise.all(
      customerIds.map(async (id) => {
        try {
          const c = await stripe.customers.retrieve(id);
          if (c && !("deleted" in c)) customerMap[id] = c as Stripe.Customer;
        } catch {
          /* skip */
        }
      }),
    );

    let invoicesRes: Stripe.ApiList<Stripe.Invoice> | null = null;
    try {
      invoicesRes = await stripe.invoices.list({ limit: 100 });
    } catch (err) {
      console.error("[orders] invoices.list failed:", err);
    }

    const invoicesByCustomer: Record<string, InvoiceRecord[]> = {};
    for (const inv of invoicesRes?.data ?? []) {
      if (inv.status !== "paid") continue;
      const custId =
        typeof inv.customer === "string" ? inv.customer : (inv.customer as Stripe.Customer | null)?.id ?? "";
      if (!custId) continue;
      if (!invoicesByCustomer[custId]) invoicesByCustomer[custId] = [];
      invoicesByCustomer[custId].push({
        id: inv.id,
        amount: inv.amount_paid,
        status: "paid",
        date: inv.created,
        description: inv.lines?.data?.[0]?.description ?? "Payment",
        hostedUrl: inv.hosted_invoice_url ?? null,
      });
    }

    for (const sub of subscriptionsRes.data) {
      const customerId =
        typeof sub.customer === "string" ? sub.customer : (sub.customer as Stripe.Customer | null)?.id ?? "";
      const customer = customerMap[customerId] ?? null;
      const monthlyItem = sub.items.data.find((item) => item.price?.recurring?.interval === "month");
      const monthlyAmount = monthlyItem?.price?.unit_amount ?? null;
      const invs = (invoicesByCustomer[customerId] ?? []).sort((a, b) => b.date - a.date);
      const totalPaid = invs.reduce((sum, i) => sum + i.amount, 0);
      const plan = derivePlan(monthlyAmount);
      let currentPeriodEnd: number | null = null;
      if (invs[0] && sub.status === "active") currentPeriodEnd = invs[0].date + 30 * 86400;

      const productType = classifySubscription((sub.metadata || {}) as Record<string, string>);
      const kind = subscriptionOrderKind(productType);
      const websiteFromMeta =
        typeof sub.metadata?.website === "string" && sub.metadata.website
          ? sub.metadata.website
          : productType === "website_care" && sub.metadata?.description
            ? String(sub.metadata.description)
            : null;

      orders.push({
        id: sub.id,
        kind,
        productLabel: subscriptionProductLabel(productType, plan),
        name: customer?.name ?? null,
        email: customer?.email ?? null,
        phone: customer?.phone ?? null,
        business: customer?.name ?? null,
        website: websiteFromMeta,
        amountTotal: totalPaid,
        currency: "AUD",
        status: sub.status,
        statusLabel: sub.status.replace(/_/g, " "),
        intakeStatus: null,
        intakeUrl: null,
        stripeUrl: `https://dashboard.stripe.com/subscriptions/${sub.id}`,
        stripeSessionId: null,
        paymentIntentId: null,
        invoiceUrl: invs[0]?.hostedUrl ?? null,
        billingAddress: formatAddress(customer?.address),
        createdAt: sub.created,
        customerId: customerId || null,
        monthlyAmount,
        currentPeriodEnd,
        invoices: invs,
        engagementId: null,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders] subscriptions failed:", msg);
  }

  orders.sort((a, b) => b.createdAt - a.createdAt);
  return Response.json({ orders });
}
