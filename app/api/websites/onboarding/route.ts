import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/html-escape";
import { createLead } from "@/lib/saabai-crm";
import { orderRef } from "@/lib/website-presence";

export const runtime = "nodejs";

const LABELS: Record<string, string> = {
  business: "Business name",
  offer: "What they sell",
  currentSite: "Current website",
  domain: "Domain to use",
  brand: "Brand colours and logo",
  pages: "First 3 pages",
  faqs: "Top 5 chatbot FAQs",
  leadEmail: "Leads go to",
};

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const f: Record<string, string> = {};
  for (const k of Object.keys(LABELS)) f[k] = clean(body[k], k === "faqs" ? 2000 : 300);
  if (!f.business || !f.offer || !f.pages) return NextResponse.json({ error: "Please fill in the required fields" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.leadEmail)) return NextResponse.json({ error: "Please use a valid lead email" }, { status: 400 });

  // Link to the paid order when we have a valid Checkout Session id.
  let ref = "";
  let buyer = "";
  let paid = false;
  const sid = clean(body.sessionId, 200);
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (key && /^cs_[A-Za-z0-9_]+$/.test(sid)) {
    try {
      const s = await new Stripe(key).checkout.sessions.retrieve(sid);
      if (s.metadata?.product === "website_presence") {
        ref = orderRef(s.id);
        buyer = s.customer_details?.email || s.customer_email || "";
        paid = s.payment_status === "paid";
      }
    } catch (err) {
      console.error("[websites onboarding] session lookup failed", err);
    }
  }

  const summary = Object.entries(LABELS).map(([k, l]) => `${l}: ${f[k] || "-"}`).join("\n");
  let saved = false;
  try {
    saved = Boolean(
      await createLead({
        companyName: f.business,
        contactName: f.business,
        email: buyer || f.leadEmail,
        source: "website_presence_onboarding",
        stage: paid ? "won" : "new",
        notes: `Presence website onboarding${ref ? ` (order ${ref}${paid ? ", deposit paid" : ""})` : ""}\n${summary}`,
      } as Parameters<typeof createLead>[0]),
    );
  } catch (err) {
    console.error("[websites onboarding] CRM save failed", err);
  }

  let emailed = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { Resend } = await import("resend");
    const rows = Object.entries(LABELS)
      .map(([k, l]) => `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px;vertical-align:top;width:180px">${l}</td><td style="padding:6px 0;font-size:14px;white-space:pre-wrap">${escapeHtml(f[k] || "-")}</td></tr>`)
      .join("");
    const { error } = await new Resend(resendKey).emails.send({
      from: process.env.BLUEPRINT_FROM_EMAIL || "Saabai <hello@saabai.ai>",
      to: "hello@saabai.ai",
      replyTo: buyer || f.leadEmail,
      subject: `Presence website onboarding: ${f.business}${ref ? ` (${ref})` : ""}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto"><h2>Presence website onboarding</h2><p>${ref ? `Order ${ref}. ${paid ? "Deposit paid." : "Payment not confirmed."}` : "No linked order."} ${buyer ? `Buyer: ${escapeHtml(buyer)}` : ""}</p><table style="border-collapse:collapse">${rows}</table><p style="color:#888;font-size:13px">Reply within 1 business day with a start date. Invoice the $1,000 balance before go-live and start the $100/mo care subscription at go-live.</p></div>`,
    });
    if (error) console.error("[websites onboarding] email failed", error);
    else emailed = true;
  }

  if (!saved && !emailed) return NextResponse.json({ error: "Could not save right now. Please email hello@saabai.ai." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
