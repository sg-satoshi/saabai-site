/** Emails for Lex subscriptions. Plain access emails only: no booking links, setup fees or model-provider wording. */
import { EMAIL_BRAND, escapeHtml, renderBrandedEmail, sendBrandedEmail } from "./email/branded-layout";
import { siteUrl } from "./billing/stripe-ops";
import type { Mailer } from "./lex-subscription";

export function lexAccessEmail(opts: { name: string; firmName: string; invitedBy?: string }) {
  const intro = opts.invitedBy
    ? `${opts.invitedBy} has added you to ${opts.firmName}'s Lex Firm plan.`
    : `Your Lex Firm plan for ${opts.firmName} is active.`;
  return renderBrandedEmail({
    subject: opts.invitedBy ? "You've been added to Lex" : "Welcome to Lex",
    eyebrow: "Lex",
    title: opts.invitedBy ? "You have access to Lex" : "Welcome to Lex",
    bodyHtml: `<p>Hi ${escapeHtml(opts.name)},</p><p>${escapeHtml(intro)} Sign in with your existing Saabai login to start researching and drafting. Lex prepares drafts; you check and sign off.</p>`,
    cta: { href: `${siteUrl()}/lex`, label: "Open Lex" },
    textBody: [`Hi ${opts.name},`, intro, `Open Lex: ${siteUrl()}/lex`],
  });
}

export const lexMailer: Mailer = {
  async welcome(o) {
    await sendBrandedEmail({ to: o.email, from: EMAIL_BRAND.from, email: lexAccessEmail(o) });
  },
};

/** Internal alert to Saabai. Never throws. */
export async function lexAlert(message: string): Promise<void> {
  try {
    await sendBrandedEmail({
      to: "hello@saabai.ai", from: EMAIL_BRAND.from,
      email: renderBrandedEmail({ subject: `Stripe: ${message.slice(0, 80)}`, title: "Stripe checkout needs a look", bodyHtml: `<p>${escapeHtml(message)}</p>`, textBody: [message] }),
    });
  } catch (err) { console.error("[lex alert]", err instanceof Error ? err.name : err); }
}
