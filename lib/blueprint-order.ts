import type Stripe from "stripe";
import { Resend } from "resend";
import { createEngagement, updateEngagement, logEvent } from "./audit-store";
import { TIERS, isTier } from "./blueprint";

const SAABAI_EMAIL = "hello@saabai.ai";
const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Handles a paid Blueprint checkout: creates the engagement in the existing
 * order engine (Redis) and emails the client their fact-find link, plus an
 * internal alert to Shane. Safe to call when Redis or Resend are missing.
 */
export async function handleBlueprintCheckout(session: Stripe.Checkout.Session) {
  const md = session.metadata ?? {};
  const tierId = isTier(md.tier) ? md.tier : "starter";
  const tier = TIERS[tierId];
  const email = session.customer_details?.email ?? session.customer_email ?? "";
  const name = md.name || session.customer_details?.name || "";
  const firstName = name.split(" ")[0] || "";
  const business = md.business || name || email;

  const engagement = await createEngagement({
    tier: tier.engineTier,
    firmName: business,
    firmType: "other",
    contactName: name,
    contactEmail: email,
    contactPhone: md.phone || undefined,
    website: md.website || undefined,
    stripeRef: session.id,
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://saabai.ai";
  const link = engagement ? `${base}/audit/factfind/${engagement.factFindToken}` : null;

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
<p>Thank you for your order. The next step is a short fact-find about your team, tools and busiest tasks. It takes about 15 minutes.</p>
${link ? `<p><a href="${link}" style="display:inline-block;background:#62c5d1;color:#0b092e;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Start my fact-find</a></p>` : `<p>I'll send your private fact-find link personally within one business day.</p>`}
${callBlock}
<p>Your Blueprint will arrive within ${tier.delivery} of your fact-find. If you book any Saabai build within 30 days of delivery, the full ${tier.priceLabel} is credited.</p>
<p style="color:#666;font-size:13px">Shane Goldberg, Saabai · ${SAABAI_EMAIL}</p></div></div>`;

  const results = await Promise.allSettled([
    email
      ? resend.emails.send({ from, to: [email], subject: `Your Saabai ${tier.name} Blueprint: next steps`, html: clientHtml })
      : Promise.resolve(null),
    resend.emails.send({
      from,
      to: [SAABAI_EMAIL],
      subject: `New ${tier.name} Blueprint order: ${business}`,
      html: `<p><b>${esc(business)}</b><br>${esc(name)} &lt;${esc(email)}&gt;<br>Phone: ${esc(md.phone || "")}<br>Website: ${esc(md.website || "")}<br>ABN: ${esc(md.abn || "")}</p><p>Paid: $${((session.amount_total ?? 0) / 100).toLocaleString("en-AU")} · Stripe ${esc(session.id)}</p><p>Engagement: ${engagement?.id ?? "NOT CREATED (Redis unavailable)"}</p>`,
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
