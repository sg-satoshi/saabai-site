import type Stripe from "stripe";
import { Resend } from "resend";
import { createEngagement, updateEngagement, logEvent, listEngagements } from "./audit-store";
import { TIERS, isTier } from "./blueprint";

const SAABAI_EMAIL = "hello@saabai.ai";
const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function customField(session: Stripe.Checkout.Session, key: string): string {
  const field = session.custom_fields?.find((f) => f.key === key);
  if (!field) return "";
  if (field.type === "text") return field.text?.value?.trim() || "";
  if (field.type === "numeric") return field.numeric?.value?.trim() || "";
  if (field.type === "dropdown") return field.dropdown?.value?.trim() || "";
  return "";
}

function formatAddress(addr: Stripe.Address | null | undefined): string | undefined {
  if (!addr) return undefined;
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/**
 * Handles a paid Blueprint checkout: creates the engagement in Redis,
 * stores key Stripe fields, emails the client their fact-find link,
 * and alerts hello@saabai.ai. Safe when Redis or Resend are missing.
 */
export async function handleBlueprintCheckout(session: Stripe.Checkout.Session) {
  const md = session.metadata ?? {};
  const tierId = isTier(md.tier) ? md.tier : "starter";
  const tier = TIERS[tierId];
  const email = session.customer_details?.email ?? session.customer_email ?? "";
  // Full name is required at Checkout (name_collection). Prefer Stripe, then metadata.
  const name =
    (session.customer_details?.name || "").trim() ||
    customField(session, "full_name") ||
    (md.name || "").trim();
  const firstName = name.split(/\s+/)[0] || "";
  const phone =
    (session.customer_details?.phone || "").trim() ||
    (md.phone || "").trim() ||
    undefined;
  const business = md.business || customField(session, "business_name") || name || email;
  const website = md.website || customField(session, "website") || undefined;
  const billingAddress = formatAddress(session.customer_details?.address);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || undefined;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || undefined;
  const amountTotal = session.amount_total ?? undefined;
  const currency = (session.currency || "aud").toUpperCase();
  let invoiceUrl: string | undefined =
    session.invoice && typeof session.invoice !== "string"
      ? (session.invoice as Stripe.Invoice).hosted_invoice_url || undefined
      : undefined;
  // Hosted invoice URL is often not expanded on the webhook payload; leave unset if so.

  // Idempotency: skip if we already created an engagement for this session.
  const existing = (await listEngagements()).find((e) => e.stripeRef === session.id);
  if (existing) {
    return { engagement: existing.id, emailed: false, duplicate: true };
  }

  const engagement = await createEngagement({
    tier: tier.engineTier,
    firmName: business,
    firmType: "other",
    contactName: name || "Name not provided",
    contactEmail: email,
    contactPhone: phone,
    website,
    stripeRef: session.id,
    paymentIntentId,
    stripeCustomerId,
    invoiceUrl,
    amountTotal,
    currency,
    billingAddress,
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://saabai.ai";
  const link = engagement ? `${base}/audit/factfind/${engagement.factFindToken}` : null;
  const stripeDash = `https://dashboard.stripe.com/payments/${paymentIntentId || session.id}`;
  const paidLabel = amountTotal != null ? `$${(amountTotal / 100).toLocaleString("en-AU")} ${currency}` : "paid";

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[blueprint] RESEND_API_KEY missing, emails skipped", { engagement: engagement?.id });
    return { engagement: engagement?.id ?? null, emailed: false };
  }
  const from = process.env.BLUEPRINT_FROM_EMAIL || `Shane at Saabai <${SAABAI_EMAIL}>`;
  const resend = new Resend(key);

  const callBlock = tier.includesCall
    ? `<p>Your ${tier.name} Blueprint includes a walkthrough call. <a href="${CALENDLY}">Pick a time that suits you</a>.</p>`
    : "";
  const clientHtml = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
<div style="background:#0b092e;padding:28px 32px;border-radius:12px 12px 0 0"><p style="color:#62c5d1;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 6px">Saabai ${tier.name} Blueprint</p><h1 style="color:#fff;margin:0;font-size:22px">You're in. Let's build your Blueprint.</h1></div>
<div style="background:#f8f8fb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e5ee;border-top:0">
<p>${firstName ? `Hi ${esc(firstName)},` : "Hi,"}</p>
<p>Thank you for your order (${esc(paidLabel)}). Your tax invoice is on its way from Stripe. The next step is a short fact-find about your team, tools and busiest tasks. It takes about 15 minutes.</p>
${link ? `<p><a href="${link}" style="display:inline-block;background:#62c5d1;color:#0b092e;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Start my fact-find</a></p>` : `<p>I'll send your private fact-find link personally within one business day.</p>`}
${callBlock}
<p>Your Blueprint will arrive within ${tier.delivery} of your fact-find. If you book any Saabai build within 30 days of delivery, the full ${tier.priceLabel} is credited.</p>
<p style="color:#666;font-size:13px">Shane Goldberg, Saabai · ${SAABAI_EMAIL}</p></div></div>`;

  const adminHtml = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
<div style="background:#0b092e;padding:22px 28px;border-radius:12px 12px 0 0"><p style="color:#c9a84c;font-size:11px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px">New Blueprint order</p><h1 style="color:#fff;margin:0;font-size:20px">${esc(tier.name)} · ${esc(paidLabel)}</h1></div>
<div style="background:#f8f8fb;padding:22px 28px;border-radius:0 0 12px 12px;border:1px solid #e5e5ee;border-top:0">
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:6px 0;color:#888;width:140px">Full name</td><td style="padding:6px 0;font-weight:600">${esc(name || "MISSING")}</td></tr>
<tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0"><a href="mailto:${esc(email)}">${esc(email || "-")}</a></td></tr>
<tr><td style="padding:6px 0;color:#888">Phone</td><td style="padding:6px 0">${esc(phone || "-")}</td></tr>
<tr><td style="padding:6px 0;color:#888">Business</td><td style="padding:6px 0">${esc(business)}</td></tr>
<tr><td style="padding:6px 0;color:#888">Website</td><td style="padding:6px 0">${esc(website || "-")}</td></tr>
<tr><td style="padding:6px 0;color:#888">ABN</td><td style="padding:6px 0">${esc(md.abn || "-")}</td></tr>
<tr><td style="padding:6px 0;color:#888">Address</td><td style="padding:6px 0">${esc(billingAddress || "-")}</td></tr>
<tr><td style="padding:6px 0;color:#888">Stripe</td><td style="padding:6px 0"><a href="${esc(stripeDash)}">${esc(session.id)}</a></td></tr>
<tr><td style="padding:6px 0;color:#888">Engagement</td><td style="padding:6px 0">${esc(engagement?.id ?? "NOT CREATED (Redis unavailable)")}</td></tr>
<tr><td style="padding:6px 0;color:#888">Fact-find</td><td style="padding:6px 0">${link ? `<a href="${esc(link)}">${esc(link)}</a>` : "-"}</td></tr>
</table>
</div></div>`;

  const results = await Promise.allSettled([
    email
      ? resend.emails.send({
          from,
          to: [email],
          subject: `Your Saabai ${tier.name} Blueprint: next steps`,
          html: clientHtml,
        })
      : Promise.resolve(null),
    resend.emails.send({
      from,
      to: [SAABAI_EMAIL],
      subject: `New ${tier.name} Blueprint order: ${name || business}`,
      html: adminHtml,
    }),
  ]);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[blueprint] email ${i} failed`, r.reason);
    else if (r.value && "error" in r.value && r.value.error) console.error(`[blueprint] email ${i} error`, r.value.error);
  });

  if (engagement && link && email) {
    await updateEngagement(engagement.id, { status: "questionnaire_sent", factFindSentAt: new Date().toISOString() });
    await logEvent(engagement.id, "questionnaire_sent", "Fact-find emailed", "Sent automatically after Blueprint checkout");
  }
  return { engagement: engagement?.id ?? null, emailed: true };
}
