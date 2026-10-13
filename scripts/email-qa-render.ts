/**
 * Render branded email HTML previews to /workspace/email-qa/*.png
 * and send one test of each to shanegoldberg@pm.me only.
 * Stu welcome is rendered only (never sent).
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { Resend } from "resend";
import {
  accessRequestAdminEmail,
  accessRequestConfirmationEmail,
  accountReadyEmail,
  adminSaleNotificationEmail,
  blueprintOrderAdminEmail,
  blueprintOrderCustomerEmail,
  passwordResetEmail,
  portalMagicLinkEmail,
  portalWelcomeInviteEmail,
} from "../lib/email/templates";
import type { BrandedEmail } from "../lib/email/branded-layout";

const OUT = "/workspace/email-qa";
mkdirSync(OUT, { recursive: true });

type Fixture = {
  file: string;
  email: BrandedEmail;
  send: boolean;
};

const fixtures: Fixture[] = [
  {
    file: "portal-magic-link",
    email: portalMagicLinkEmail({
      name: "Shane Goldberg",
      link: "https://www.saabai.ai/client-portal/auth?token=preview-token",
      code: "482916",
    }),
    send: true,
  },
  {
    file: "access-request-confirmation",
    email: accessRequestConfirmationEmail({ name: "Shane Goldberg", autoApproved: false }),
    send: true,
  },
  {
    file: "access-request-auto-approved",
    email: accessRequestConfirmationEmail({ name: "Shane Goldberg", autoApproved: true }),
    send: true,
  },
  {
    file: "access-request-admin",
    email: accessRequestAdminEmail({
      name: "Shane Goldberg",
      email: "shanegoldberg@pm.me",
      company: "Saabai",
      about: "QA access request",
      note: "Preview only",
      autoApproved: false,
    }),
    send: true,
  },
  {
    file: "blueprint-order-customer",
    email: blueprintOrderCustomerEmail({
      name: "Shane Goldberg",
      tierName: "Growth",
      paidLabel: "$2,490 AUD",
      delivery: "5 business days",
      priceLabel: "$2,490",
      factFindUrl: "https://www.saabai.ai/audit/factfind/preview",
      includesCall: true,
      calendlyUrl: "https://calendly.com/shanegoldberg/30min",
    }),
    send: true,
  },
  {
    file: "blueprint-order-admin",
    email: blueprintOrderAdminEmail({
      tierName: "Growth",
      paidLabel: "$2,490 AUD",
      name: "Shane Goldberg",
      email: "shanegoldberg@pm.me",
      phone: "+61 400 000 000",
      business: "Saabai",
      website: "https://www.saabai.ai",
      abn: "71 889 082 572",
      billingAddress: "Brisbane QLD",
      stripeUrl: "https://dashboard.stripe.com/payments/preview",
      sessionId: "cs_test_preview",
      engagementId: "eng_preview",
      factFindUrl: "https://www.saabai.ai/audit/factfind/preview",
    }),
    send: true,
  },
  {
    file: "admin-sale-notification",
    email: adminSaleNotificationEmail({
      productName: "Website Care",
      customerName: "Shane Goldberg",
      customerEmail: "shanegoldberg@pm.me",
      amountLabel: "$149 AUD / month",
      detailLines: ["Session: cs_test_preview", "Source: saabai-sell"],
    }),
    send: true,
  },
  {
    file: "account-ready",
    email: accountReadyEmail({
      name: "Shane Goldberg",
      email: "shanegoldberg@pm.me",
      setPasswordLink: "https://www.saabai.ai/set-password?token=preview",
    }),
    send: true,
  },
  {
    file: "password-reset",
    email: passwordResetEmail({
      name: "Shane Goldberg",
      resetLink: "https://www.saabai.ai/set-password?token=preview-reset",
    }),
    send: true,
  },
  {
    file: "portal-welcome",
    email: portalWelcomeInviteEmail({
      name: "Shane Goldberg",
      business: "Saabai QA",
      link: "https://www.saabai.ai/client-portal/auth?token=preview-welcome",
    }),
    send: true,
  },
  {
    file: "stu-welcome",
    email: portalWelcomeInviteEmail({
      name: "Stu",
      business: "Stu's Cycle Repairs",
      link: "https://www.saabai.ai/client-portal/auth?token=stu-preview-not-sent",
    }),
    send: false,
  },
];

async function screenshotHtml(html: string, outPng: string) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 680, height: 900, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load" });
    const height = await page.evaluate(() => Math.max(document.body.scrollHeight, 900));
    await page.setViewport({ width: 680, height: Math.min(height + 40, 2400), deviceScaleFactor: 2 });
    await page.screenshot({ path: outPng, fullPage: true, type: "png" });
  } finally {
    await browser.close();
  }
}

async function sendTest(email: BrandedEmail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: "Saabai <noreply@saabai.ai>",
    to: "shanegoldberg@pm.me",
    subject: `[QA preview] ${email.subject}`,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(JSON.stringify(error));
  return data?.id || "ok";
}

async function main() {
  const report: Array<{ file: string; subject: string; sent: boolean; sendId: string | null }> = [];
  for (const f of fixtures) {
    console.log("render", f.file);
    writeFileSync(path.join(OUT, `${f.file}.html`), f.email.html);
    writeFileSync(path.join(OUT, `${f.file}.txt`), f.email.text);
    writeFileSync(
      path.join(OUT, `${f.file}.meta.json`),
      JSON.stringify({ subject: f.email.subject, send: f.send }, null, 2),
    );
    await screenshotHtml(f.email.html, path.join(OUT, `${f.file}.png`));
    let sendId: string | null = null;
    if (f.send) {
      sendId = await sendTest(f.email);
      console.log("sent", f.file, sendId);
    } else {
      console.log("SKIP send", f.file);
    }
    report.push({ file: f.file, subject: f.email.subject, sent: f.send, sendId });
  }
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("done", report.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
