/**
 * GET /api/admin/payments/history
 * Returns recent PaymentIntents + Invoices merged by date.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../../lib/auth";
import { getStripe } from "../../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export interface PaymentRecord {
  id: string;
  type: "charge" | "invoice";
  amount: number; // cents
  currency: string;
  description: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  date: number; // unix timestamp
  url: string | null; // receipt or invoice url
}

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
    const [paymentIntents, invoices] = await Promise.all([
      stripe.paymentIntents.list({ limit: 50 }),
      stripe.invoices.list({ limit: 50 }),
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

    // Sort by date descending
    records.sort((a, b) => b.date - a.date);

    return NextResponse.json({ records });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[payments/history]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
