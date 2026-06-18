/**
 * POST /api/site-factory/save-external
 * Create a record for an externally built site (Lovable, Replit, etc.).
 * Includes optional billing info for monthly management.
 * When billing is set, auto-creates a recurring invoice in the invoice tracker.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { createSite } from "../../../../lib/site-registry";
import { createInvoice } from "../../../../lib/invoice-store";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const {
      slug, name, niche, description, externalUrl, externalPlatform,
      chatbotEnabled, chatbotName, chatbotGreeting,
      billingAmount, billingStatus, billingNotes,
    } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const site = await createSite({
      slug,
      name,
      niche: niche || "other",
      description: description || "",
      status: "live",
      url: externalUrl || `https://www.saabai.ai/sites/${slug}/`,
      source: "external",
      externalUrl: externalUrl || undefined,
      externalPlatform: externalPlatform || undefined,
      billing: billingAmount ? {
        amount: Math.round(parseFloat(billingAmount) * 100),
        status: billingStatus || "active",
        notes: billingNotes || undefined,
      } : undefined,
      business: {
        name,
      },
      chatbot: {
        enabled: chatbotEnabled ?? false,
        name: chatbotName || `${name} Assistant`,
        greeting: chatbotGreeting || "Hi! How can I help?",
        systemPrompt: `You are the assistant for ${name}. Help visitors with their inquiries.`,
      },
    });

    // Auto-create a recurring invoice in the invoice tracker when billing is set
    let invoiceId: string | null = null;
    if (billingAmount) {
      const amtCents = Math.round(parseFloat(billingAmount) * 100);
      const now = new Date();
      const invNumber = await getNextInvoiceNumber();
      const amtInDollars = parseFloat((amtCents / 100).toFixed(2));
      const gstAmount = Math.round(amtCents * 0.1) / 100;
      const invoice = await createInvoice({
        number: invNumber,
        date: now.toISOString().slice(0, 10),
        clientId: `site-${slug}`,
        lineItems: [
          {
            type: "fixed",
            description: `${name} — Website Management (${externalPlatform || "External"})`,
            total: amtInDollars,
          },
        ],
        notes: billingNotes || `Recurring — ${billingStatus || "active"}`,
        status: billingStatus === "paid" ? "paid" : "unpaid",
      });
      invoiceId = invoice.id;
    }

    return NextResponse.json({ site, invoiceId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[site-factory/save-external]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Get the next invoice number (SG-NNN).
 * Uses the invoice-store's listInvoices to find the highest number.
 */
async function getNextInvoiceNumber(): Promise<string> {
  try {
    const { listInvoices } = await import("../../../../lib/invoice-store");
    const invoices = await listInvoices();
    let max = 0;
    for (const inv of invoices) {
      const match = inv.number.match(/SG-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > max) max = n;
      }
    }
    return `SG-${String(max + 1).padStart(3, "0")}`;
  } catch {
    return "SG-001";
  }
}
