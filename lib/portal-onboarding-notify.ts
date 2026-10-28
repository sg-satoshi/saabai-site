/**
 * One notice to Saabai admin when onboarding is completed.
 * The client is not emailed. A customer inbox is not a fallback.
 */
import { EMAIL_BRAND, renderBrandedEmail, sendBrandedEmail, type BrandedEmail } from "./email/branded-layout";
import {
  CYCLE_REPAIR_LEAD_EMAIL,
  SAABAI_ADMIN_EMAIL,
  planPortalRequestAlert,
  type EnvLike,
} from "./notify-routing";

const BLOCKED = new Set([
  CYCLE_REPAIR_LEAD_EMAIL.toLowerCase(),
  "info@boconsulting.com.au",
  "hello@wholesalehomes.com.au",
]);

export function onboardingAdminEmail(env: EnvLike = process.env, clientEmail?: string): string | null {
  const plan = planPortalRequestAlert({ priority: "new" }, env);
  const email = plan.emailTo.trim();
  const lower = email.toLowerCase();
  if (!email || !lower.includes("@")) return null;
  if (BLOCKED.has(lower)) return null;
  const client = (clientEmail || "").trim().toLowerCase();
  if (client && lower === client && lower !== SAABAI_ADMIN_EMAIL.toLowerCase()) return null;
  return email;
}

export function onboardingCompleteEmail(input: {
  clientName: string;
  clientEmail: string;
  businessName: string;
  clientId: string;
  tier: string;
  link: string;
}): BrandedEmail {
  const who = input.businessName || input.clientName || input.clientEmail;
  return renderBrandedEmail({
    subject: `Onboarding complete: ${who}`,
    eyebrow: "Client portal",
    title: "A client finished onboarding",
    preheader: `${who} completed the portal checklist.`,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${EMAIL_BRAND.text};">${escape(who)} finished the portal checklist.</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${EMAIL_BRAND.text};">Contact: ${escape(input.clientName)} · ${escape(input.clientEmail)}</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${EMAIL_BRAND.text};">Tier: ${escape(input.tier)}. Client id: ${escape(input.clientId)}.</p>
    `,
    textBody: [
      `${who} finished the portal checklist.`,
      `Contact: ${input.clientName} · ${input.clientEmail}`,
      `Tier: ${input.tier}. Client id: ${input.clientId}.`,
    ],
    cta: { href: input.link, label: "View onboarding progress" },
    footnote: "This note goes to Saabai admin only.",
  });
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
}

export async function notifyOnboardingComplete(args: {
  clientEmail: string;
  clientName: string;
  businessName: string;
  clientId: string;
  tier: string;
  env?: EnvLike;
  baseUrl?: string;
  sendEmail?: (to: string, email: BrandedEmail) => Promise<boolean>;
  sendTelegram?: (token: string, chatId: string, text: string) => Promise<boolean>;
}): Promise<{ sent: boolean; to: string | null }> {
  const env = args.env ?? process.env;
  const to = onboardingAdminEmail(env, args.clientEmail);
  if (!to) return { sent: false, to: null };
  const base = (args.baseUrl || env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai").replace(/\/$/, "");
  const link = `${base}/saabai-admin/onboarding`;
  const branded = onboardingCompleteEmail({
    clientName: args.clientName,
    clientEmail: args.clientEmail,
    businessName: args.businessName,
    clientId: args.clientId,
    tier: args.tier,
    link,
  });
  const sendEmail = args.sendEmail ?? ((dest, email) => sendBrandedEmail({ to: dest, email, from: EMAIL_BRAND.fromPortal }));
  let emailOk = false;
  try {
    emailOk = await sendEmail(to, branded);
  } catch {
    emailOk = false;
  }

  const plan = planPortalRequestAlert({ priority: "new" }, env);
  let telegramOk = false;
  if (plan.telegram && args.sendTelegram) {
    const text = [
      `Onboarding complete: ${args.businessName || args.clientName}.`,
      `${args.clientName} · ${args.clientEmail}`,
      `Tier: ${args.tier}.`,
      link,
    ].join("\n");
    try {
      telegramOk = await args.sendTelegram(plan.telegram.token, plan.telegram.chatId, text);
    } catch {
      telegramOk = false;
    }
  }
  return { sent: emailOk || telegramOk, to };
}
