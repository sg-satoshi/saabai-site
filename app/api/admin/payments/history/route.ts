/**
 * GET /api/admin/payments/history
 * Returns recent PaymentIntents + Invoices + Subscriptions merged by date.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../../lib/auth";
import { getStripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export type PaymentRecordType = "charge" | "invoice" | "subscription";

export interface PaymentRecord {
  id: string;
  type: PaymentRecordType;
  amount: number; // cents
  currency: string;
  description: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  date: number; // unix timestamp
  url: string | null;
  /** For subscriptions — the billing interval */
  interval?: string;
  /** For subscriptions — when the current period ends */
  currentPeriodEnd?: number;
}

const INTERVAL_LABELS: Record<string, string> = {
  "weekly": "weekly",
  "fortnightly": "fortnightly",
  "monthly": "monthly",
  "quarterly": "quarterly",
  "yearly": "yearly",
};

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  try {
    const [paymentIntents, invoices, subscriptions] = await Promise.all([
      stripe.paymentIntents.list({ limit: 50 }),
      stripe.invoices.list({ limit: 50 }),
      stripe.subscriptions.list({ limit: 100 }),
    ]);

    const records: PaymentRecord[] = [];

    for (const pi of paymentIntents.data) {
      records.push({
        id: pi.id,
        type: "charge",
        amount: pi.amount,
        currency: pi.currency,
        description: pi.description || "",
        customerName: null,
        customerEmail: null,
        status: pi.status,
        date: pi.created,
        url: (pi as unknown as Record<string, string | null>)["receipt_url"] || null,
      });
    }

    for (const inv of invoices.data) {
      records.push({
        id: inv.id,
        type: "invoice",
        amount: inv.amount_due,
        currency: inv.currency,
        description: inv.lines?.data?.[0]?.description || inv.description || "",
        customerName: null,
        customerEmail: null,
        status: inv.status || "draft",
        date: inv.created,
        url: inv.hosted_invoice_url || inv.invoice_pdf || null,
      });
    }

    for (const sub of subscriptions.data) {
      const subAny = sub as unknown as Record<string, unknown>;
      const items = subAny.items as Record<string, unknown> | undefined;
      const item = (items?.data as Record<string, unknown>[] | undefined)?.[0];
      const price = item?.price as Record<string, unknown> | undefined;
      const meta = (subAny.metadata as Record<string, string>) || {};
      records.push({
        id: sub.id,
        type: "subscription",
        amount: (price?.unit_amount as number) ?? 0,
        currency: (price?.currency as string) ?? "aud",
        description: (meta.description as string) || (price?.nickname as string) || "Subscription",
        customerName: null,
        customerEmail: null,
        status: sub.status,
        date: sub.created,
        url: null,
        interval: (meta.interval as string) || (price?.recurring ? `${(price.recurring as Record<string, unknown>).interval_count || 1}x ${(price.recurring as Record<string, unknown>).interval}` : undefined),
        currentPeriodEnd: subAny.current_period_end as number | undefined,
      });
    }

    // Sort by date descending
    records.sort((a, b) => b.date - a.date);

    // Also return active subscriptions separately for the subscriptions panel
    const activeSubscriptions = subscriptions.data
      .filter(s => s.status === "active" || s.status === "trialing" || s.status === "past_due")
      .map(sub => {
        const s = sub as unknown as Record<string, unknown>;
        const items = s.items as Record<string, unknown> | undefined;
        const price = (items?.data as Record<string, unknown>[] | undefined)?.[0]?.price as Record<string, unknown> | undefined;
        const meta = (s.metadata as Record<string, string>) || {};
        return {
          id: sub.id,
          amount: (price?.unit_amount as number) ?? 0,
          currency: (price?.currency as string) ?? "aud",
          description: (meta.description as string) || (price?.nickname as string) || "Subscription",
          customer: sub.customer,
          status: sub.status,
          interval: (meta.interval as string) || (price?.recurring ? `${(price.recurring as Record<string, unknown>).interval_count || 1}x ${(price.recurring as Record<string, unknown>).interval}` : "recurring"),
          currentPeriodEnd: s.current_period_end as number | undefined,
          created: sub.created,
          startDate: s.start_date as number | undefined,
          cancelAtPeriodEnd: s.cancel_at_period_end as boolean | undefined,
        };
      });

    return NextResponse.json({ records, activeSubscriptions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/history]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
