/** Branded emails for the Blueprint portal. No em dashes in copy. */
import { escapeHtml, renderBrandedEmail, type BrandedEmail } from "../email/branded-layout";

const first = (n?: string | null) => (n || "").trim().split(/\s+/)[0] || "there";
const p = (h: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">${h}</p>`;
const muted = (h: string) => `<p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:#5f6580;">${h}</p>`;

export function portalLinkEmail(o: { name?: string; link: string; firstLink?: boolean }): BrandedEmail {
  const f = escapeHtml(first(o.name));
  const expiry = o.firstLink ? "24 hours" : "15 minutes";
  return renderBrandedEmail({
    subject: o.firstLink ? "Your Saabai Blueprint portal is ready" : "Your Saabai portal sign-in link",
    preheader: o.firstLink ? "One tap to start your fact-find." : `One tap to pick up where you left off. The link expires in ${expiry}.`,
    eyebrow: "Client Portal",
    title: o.firstLink ? "Your portal is ready" : "Pick up where you left off",
    bodyHtml: [
      p(`Hi ${f},`),
      p(o.firstLink
        ? "Thanks for your order. Your private portal is where you answer the fact-find for your Blueprint. It takes about 15 minutes, you can stop any time, and everything saves as you go."
        : "Tap the button to open your Saabai portal. Your answers are saved, and we will open the first section you have not finished."),
      muted(`This link works once and expires in ${expiry}. ${o.firstLink ? "After that, sign in any time with just your email at saabai.ai/portal/login." : "If you did not ask for it, you can ignore this email."}`),
    ].join(""),
    cta: { href: o.link, label: o.firstLink ? "Start my fact-find" : "Open my portal" },
    textBody: [
      `Hi ${first(o.name)},`,
      "",
      o.firstLink
        ? "Thanks for your order. Your private portal is where you answer the fact-find for your Blueprint. About 15 minutes, and everything saves as you go."
        : "Use the link below to open your Saabai portal. We will open the first section you have not finished.",
      `The link works once and expires in ${expiry}.`,
    ],
  });
}

export function submitConfirmationEmail(o: { name?: string; tierName: string; portalUrl: string; answered: number; total: number }): BrandedEmail {
  const f = escapeHtml(first(o.name));
  return renderBrandedEmail({
    subject: "We have your fact-find: your Blueprint is in the queue",
    preheader: "Submitted. Here is what happens next.",
    eyebrow: `${o.tierName} Blueprint`,
    title: "Thanks, your fact-find is in",
    bodyHtml: [
      p(`Hi ${f},`),
      p(`We have received your answers (${o.answered} of ${o.total} questions answered). Your submission is now locked so the build team works from one stable version.`),
      p("<strong>What happens next</strong>"),
      p("1. We review your answers and may reach out with a question or two.<br/>2. We prepare your Blueprint.<br/>3. You receive it in your portal and by email."),
      muted("Need to change something? Reply to this email and we will reopen your fact-find for you."),
    ].join(""),
    cta: { href: o.portalUrl, label: "View my submission" },
    textBody: [
      `Hi ${first(o.name)},`,
      "",
      `We have received your answers (${o.answered} of ${o.total} questions answered). Your submission is now locked so the build team works from one stable version.`,
      "Next: we review your answers, prepare your Blueprint, and send it to you in your portal and by email.",
      "Need to change something? Reply to this email and we will reopen your fact-find.",
    ],
  });
}

export function adminReadyEmail(o: { firmName: string; tier: string; contactName: string; contactEmail: string; adminUrl: string; answered: number; total: number; blanks: number }): BrandedEmail {
  return renderBrandedEmail({
    subject: `Ready to build: ${o.firmName} (${o.tier})`,
    preheader: `${o.answered} of ${o.total} answered`,
    eyebrow: "Blueprint portal",
    title: "A client submitted for build",
    bodyHtml: [
      p(`<strong>${escapeHtml(o.firmName)}</strong> submitted their fact-find.`),
      p(`Plan: ${escapeHtml(o.tier)}<br/>Contact: ${escapeHtml(o.contactName)} (${escapeHtml(o.contactEmail)})<br/>Answers: ${o.answered} of ${o.total}${o.blanks ? ` (${o.blanks} left blank)` : ""}`),
    ].join(""),
    cta: { href: o.adminUrl, label: "Open in admin" },
    textBody: [
      `${o.firmName} submitted their fact-find.`,
      `Plan: ${o.tier}. Contact: ${o.contactName} (${o.contactEmail}). Answers: ${o.answered} of ${o.total}.`,
    ],
  });
}

export function unlockedEmail(o: { name?: string; portalUrl: string }): BrandedEmail {
  const f = escapeHtml(first(o.name));
  return renderBrandedEmail({
    subject: "Your fact-find is open for edits again",
    preheader: "You can update your answers and submit again.",
    eyebrow: "Client Portal",
    title: "Your fact-find is open again",
    bodyHtml: [
      p(`Hi ${f},`),
      p("We have reopened your fact-find so you can update your answers. When you are happy, review and submit again."),
    ].join(""),
    cta: { href: o.portalUrl, label: "Open my portal" },
    textBody: [`Hi ${first(o.name)},`, "", "We have reopened your fact-find so you can update your answers. Review and submit again when you are happy."],
  });
}

export function reportReadyEmail(o: { name?: string; tierName: string; portalUrl: string }): BrandedEmail {
  const f = escapeHtml(first(o.name));
  return renderBrandedEmail({
    subject: "Your Saabai Blueprint is ready",
    preheader: "Open your portal to download it.",
    eyebrow: `${o.tierName} Blueprint`,
    title: "Your Blueprint is ready",
    bodyHtml: [
      p(`Hi ${f},`),
      p("Your Blueprint has been reviewed by our team and is ready in your portal. You can download it there any time."),
      muted("Sign in with just your email at saabai.ai/portal/login. Questions? Reply to this email."),
    ].join(""),
    cta: { href: o.portalUrl, label: "Open my Blueprint" },
    textBody: [
      `Hi ${first(o.name)},`,
      "",
      "Your Blueprint has been reviewed by our team and is ready in your portal. You can download it there any time.",
      `Open it here: ${o.portalUrl}`,
    ],
  });
}
