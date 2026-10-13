/**
 * Billing emails (setup link, payment failed, dunning reminders, paused).
 * Mission Control layout, professional with a little sass, no em dashes.
 */
import { EMAIL_BRAND, escapeHtml, renderBrandedEmail, type BrandedEmail } from "../email/branded-layout";
import { formatAud } from "./catalog";
import { upfrontTotals } from "./state";

export const SENDER_OPTIONS = [
  { value: EMAIL_BRAND.from, label: "Saabai default sender" },
  { value: EMAIL_BRAND.fromShane, label: "Shane at Saabai" },
];
export const DEFAULT_SENDER = EMAIL_BRAND.from;
export const isAllowedSender = (s: string) => SENDER_OPTIONS.some((o) => o.value === s);

const money = (c: number) => `${formatAud(c).replace(/^\$/, "$")}${c % 100 === 0 ? ".00" : ""}`;
const first = (name: string) => (name || "").trim().split(/\s+/)[0] || "there";

function table(rows: [string, string, boolean?][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${EMAIL_BRAND.border};border-radius:10px;border-collapse:separate;margin:18px 0;">${rows
    .map(([l, v, strong], i) => `<tr><td style="padding:11px 14px;font-size:14px;color:${EMAIL_BRAND.text};${i ? `border-top:1px solid ${EMAIL_BRAND.border};` : ""}${strong ? "font-weight:700;" : ""}">${escapeHtml(l)}</td><td align="right" style="padding:11px 14px;font-size:14px;font-family:'Geist Mono',ui-monospace,Menlo,monospace;color:${EMAIL_BRAND.text};${i ? `border-top:1px solid ${EMAIL_BRAND.border};` : ""}${strong ? "font-weight:700;" : ""}">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
}
const p = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.text};">${s}</p>`;
const small = (s: string) => `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.muted};">${s}</p>`;

const CANCEL_COPY = "Cancel any time. Your site stays covered until the end of that billing month, then it ends. No hard feelings, no exit interview.";

export interface SetupEmailInput {
  contactName: string;
  siteName: string;
  siteDomain?: string;
  planName: string;
  monthlyCents: number;
  setupFeeCents: number;
  setupFeeDescription?: string;
  startDate: string; // YYYY-MM-DD
  gst: boolean;
  payUrl: string;
}

export function nextCycleLabel(startDate: string): string {
  const d = new Date(`${startDate}T00:00:00+10:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
}

export function setupLinkEmail(i: SetupEmailInput): BrandedEmail {
  const t = upfrontTotals(i.monthlyCents, i.setupFeeCents, i.gst);
  const rows: [string, string, boolean?][] = [[`${i.planName}, first month`, money(t.firstMonth)]];
  if (t.setup) rows.push([`Setup${i.setupFeeDescription ? `: ${i.setupFeeDescription}` : " fee"}`, money(t.setup)]);
  if (i.gst) rows.push(["GST", money(t.gst)]);
  rows.push(["Due today", money(t.dueNow), true], [`Then monthly from ${nextCycleLabel(i.startDate)}`, money(t.monthly)]);
  const where = i.siteDomain || i.siteName;
  return renderBrandedEmail({
    subject: `Your ${i.planName} plan is ready to go`,
    preheader: `One quick step to keep ${where} looked after.`,
    eyebrow: "Website care",
    title: `Hi ${escapeHtml(first(i.contactName))}, let's keep it that way`,
    bodyHtml:
      p(`Your site's live and looking sharp. ${escapeHtml(i.planName)} keeps ${escapeHtml(where)} hosted, secure, backed up and updated. You run the business, we keep the website out of your way. Fair trade.`) +
      table(rows) +
      small(`${i.gst ? "Prices include GST." : "GST not applicable."} Takes about a minute. Card or bank debit, handled securely by Stripe. This link is valid for 7 days. ${CANCEL_COPY}`),
    cta: { href: i.payUrl, label: "Set up payment" },
    footnote: "Questions? Just reply. A real person reads these, usually me. Shane, Saabai",
    textBody: [
      `Hi ${first(i.contactName)},`,
      `Your site's live and looking sharp. ${i.planName} keeps ${where} hosted, secure, backed up and updated.`,
      ...rows.map(([l, v]) => `${l}: ${v}`),
      `Set up payment (valid 7 days): ${i.payUrl}`,
      `${i.gst ? "Prices include GST." : "GST not applicable."} ${CANCEL_COPY}`,
      "Questions? Just reply. Shane, Saabai",
    ],
  });
}

export interface DunningInput {
  contactName: string;
  siteName: string;
  planName: string;
  amountCents: number;
  invoiceNumber?: string;
  cardLast4?: string;
  updateUrl: string;
  /** 0 = immediately on failure, then day 1, 3, 7, 14 ... */
  day: number;
}

export function paymentFailedEmail(i: DunningInput): BrandedEmail {
  const card = i.cardLast4 ? `the card ending ${escapeHtml(i.cardLast4)}` : "your card";
  const rows: [string, string, boolean?][] = [];
  if (i.invoiceNumber) rows.push(["Invoice", i.invoiceNumber]);
  rows.push(["Amount due", money(i.amountCents), true], ["GST", "Not applicable"]);
  const variants: Record<string, { subject: string; eyebrow: string; title: string; lead: string; next: string }> = {
    first: {
      subject: `Payment didn't go through for ${i.siteName}`,
      eyebrow: "Payment didn't go through",
      title: `Hi ${escapeHtml(first(i.contactName))}, your card said no`,
      lead: `We tried to charge <strong>${money(i.amountCents)}</strong> for ${escapeHtml(i.planName)} on ${escapeHtml(i.siteName)} and ${card} was declined. It happens. Expired cards are the usual suspect.`,
      next: "We'll send a friendly reminder tomorrow, then on day 3 and day 7 if it's still outstanding.",
    },
    early: {
      subject: `Quick nudge: ${i.siteName} payment still pending`,
      eyebrow: "Friendly reminder",
      title: `Hi ${escapeHtml(first(i.contactName))}, still waiting on that card`,
      lead: `${money(i.amountCents)} for ${escapeHtml(i.planName)} on ${escapeHtml(i.siteName)} is still outstanding. Thirty seconds with a fresh card and we're square.`,
      next: "We'll keep the reminders polite, but we will keep sending them.",
    },
    late: {
      subject: `Action needed: ${i.siteName} is past due`,
      eyebrow: "Past due",
      title: `Hi ${escapeHtml(first(i.contactName))}, let's sort this before it gets awkward`,
      lead: `${money(i.amountCents)} for ${escapeHtml(i.planName)} on ${escapeHtml(i.siteName)} is now ${i.day} days overdue. After 30 days unpaid we have to pause the site, and nobody wants that.`,
      next: "Update your card and everything carries on as normal.",
    },
  };
  const v = i.day === 0 ? variants.first : i.day < 7 ? variants.early : variants.late;
  return renderBrandedEmail({
    subject: v.subject,
    preheader: "Pop in a new card and you're done.",
    eyebrow: v.eyebrow,
    title: v.title,
    bodyHtml: p(v.lead) + p("Your site is still up and covered. Pop in a new card and you're done.") + table(rows) + small(`Securely handled by Stripe. ${v.next} Already sorted it? Ignore this one. Questions? Just reply.`),
    cta: { href: i.updateUrl, label: "Update card" },
    footnote: `Shane, Saabai. ${CANCEL_COPY}`,
    textBody: [`Hi ${first(i.contactName)},`, v.lead.replace(/<[^>]+>/g, ""), `Update card: ${i.updateUrl}`, v.next],
  });
}

export function sitePausedEmail(i: { contactName: string; siteName: string; updateUrl: string }): BrandedEmail {
  return renderBrandedEmail({
    subject: `${i.siteName} has been paused`,
    eyebrow: "Site paused",
    title: `Hi ${escapeHtml(first(i.contactName))}, we've had to pause your site`,
    bodyHtml: p(`After 30 days unpaid, ${escapeHtml(i.siteName)} is paused. Your content is safe and nothing is deleted. Update your card and we'll switch it straight back on.`),
    cta: { href: i.updateUrl, label: "Update card and restore" },
    footnote: "Questions? Just reply. Shane, Saabai",
    textBody: [`Hi ${first(i.contactName)},`, `After 30 days unpaid, ${i.siteName} is paused. Update your card to restore it: ${i.updateUrl}`],
  });
}

export function quoteRequestAdminEmail(i: { siteName: string; addonName: string; clientEmail: string; notes: string }): BrandedEmail {
  return renderBrandedEmail({
    subject: `Quote request: ${i.addonName} for ${i.siteName}`,
    eyebrow: "Add-on quote",
    title: `${escapeHtml(i.siteName)} wants ${escapeHtml(i.addonName)}`,
    bodyHtml: p(`From ${escapeHtml(i.clientEmail)}`) + p(escapeHtml(i.notes || "No notes.")),
    cta: { href: `${EMAIL_BRAND.siteUrl}/saabai-admin/requests`, label: "Open requests" },
    textBody: [`${i.siteName} wants ${i.addonName}`, `From ${i.clientEmail}`, i.notes],
  });
}
