/**
 * Shared Mission Control email layout for Saabai.ai Resend mail.
 * Table-based HTML for Gmail, Outlook and Apple Mail (incl. dark mode + mobile).
 * No em dashes in copy. Plain-text companion always returned.
 */

export const EMAIL_BRAND = {
  from: "Saabai <noreply@saabai.ai>",
  fromPortal: "Saabai Portal <portal@saabai.ai>",
  fromShane: "Shane at Saabai <hello@saabai.ai>",
  logoUrl: "https://www.saabai.ai/brand/saabai-logo-full.png",
  siteUrl: "https://www.saabai.ai",
  portalUrl: "https://www.saabai.ai/client-portal",
  supportEmail: "hello@saabai.ai",
  abn: "71 889 082 572",
  navy: "#0b092e",
  navyDeep: "#07061f",
  teal: "#62c5d1",
  tealDark: "#0e7482",
  gold: "#c9a227",
  text: "#13152a",
  muted: "#5f6580",
  border: "#dfe2ea",
  bg: "#f4f5f9",
  white: "#ffffff",
} as const;

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export type BrandedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type LayoutInput = {
  subject: string;
  preheader?: string;
  eyebrow?: string;
  title: string;
  /** HTML body blocks (already escaped where needed). */
  bodyHtml: string;
  cta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  /** Extra footer note (plain text, will be escaped). */
  footnote?: string;
  /** Plain-text body paragraphs (no HTML). */
  textBody: string[];
};

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td align="center" bgcolor="${EMAIL_BRAND.teal}" style="border-radius:10px;background-color:${EMAIL_BRAND.teal};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="16%" strokecolor="${EMAIL_BRAND.teal}" fillcolor="${EMAIL_BRAND.teal}">
        <w:anchorlock/>
        <center style="color:${EMAIL_BRAND.navy};font-family:Inter,Segoe UI,Arial,sans-serif;font-size:15px;font-weight:700;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${EMAIL_BRAND.navy};text-decoration:none;border-radius:10px;background-color:${EMAIL_BRAND.teal};mso-hide:all;">${safeLabel}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

export function renderBrandedEmail(input: LayoutInput): BrandedEmail {
  const preheader = input.preheader || input.subject;
  const eyebrow = input.eyebrow || "Saabai";
  const footnote = input.footnote
    ? `<p style="margin:20px 0 0;font-size:12.5px;line-height:1.55;color:${EMAIL_BRAND.muted};">${escapeHtml(input.footnote)}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light dark"/>
  <meta name="supported-color-schemes" content="light dark"/>
  <title>${escapeHtml(input.subject)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #0b092e !important; }
      .email-card { background-color: #14123a !important; }
      .email-copy, .email-copy p, .email-copy li { color: #e8eaf8 !important; }
      .email-muted { color: #9aa0c8 !important; }
      .email-footer { color: #8f95c0 !important; }
    }
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding: 24px 18px !important; }
      .email-title { font-size: 22px !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:${EMAIL_BRAND.bg};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${EMAIL_BRAND.bg};opacity:0;">
    ${escapeHtml(preheader)}${"&nbsp;".repeat(40)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_BRAND.bg};margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="email-shell" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
          <tr>
            <td class="email-card" style="background-color:${EMAIL_BRAND.white};border-radius:16px;overflow:hidden;border:1px solid ${EMAIL_BRAND.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${EMAIL_BRAND.navy}" style="background-color:${EMAIL_BRAND.navy};padding:28px 32px;text-align:left;">
                    <img src="${EMAIL_BRAND.logoUrl}" width="148" alt="Saabai" style="display:block;border:0;outline:none;height:auto;max-width:148px;"/>
                    <p style="margin:16px 0 0;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${EMAIL_BRAND.teal};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">${escapeHtml(eyebrow)}</p>
                    <h1 class="email-title" style="margin:10px 0 0;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:${EMAIL_BRAND.white};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">${escapeHtml(input.title)}</h1>
                  </td>
                </tr>
                <tr>
                  <td class="email-pad email-copy" style="padding:32px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.text};">
                    ${input.bodyHtml}
                    ${input.cta ? ctaButton(input.cta.href, input.cta.label) : ""}
                    ${input.secondaryCta ? `<p style="margin:12px 0 0;font-size:13.5px;"><a href="${escapeHtml(input.secondaryCta.href)}" style="color:${EMAIL_BRAND.tealDark};font-weight:600;text-decoration:none;">${escapeHtml(input.secondaryCta.label)}</a></p>` : ""}
                    ${footnote}
                  </td>
                </tr>
                <tr>
                  <td class="email-pad email-footer" style="padding:20px 32px 28px;border-top:1px solid ${EMAIL_BRAND.border};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.55;color:${EMAIL_BRAND.muted};">
                    <p style="margin:0;">Saabai · ABN ${EMAIL_BRAND.abn}</p>
                    <p style="margin:6px 0 0;">Questions? <a href="mailto:${EMAIL_BRAND.supportEmail}" style="color:${EMAIL_BRAND.tealDark};text-decoration:none;">${EMAIL_BRAND.supportEmail}</a> · <a href="${EMAIL_BRAND.siteUrl}" style="color:${EMAIL_BRAND.tealDark};text-decoration:none;">saabai.ai</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 8px 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;color:${EMAIL_BRAND.muted};">
              You are getting this because you have a Saabai account or order.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    input.title,
    "",
    ...input.textBody,
    input.cta ? `${input.cta.label}: ${input.cta.href}` : "",
    input.secondaryCta ? `${input.secondaryCta.label}: ${input.secondaryCta.href}` : "",
    input.footnote || "",
    "",
    `Saabai · ABN ${EMAIL_BRAND.abn}`,
    `Support: ${EMAIL_BRAND.supportEmail}`,
    EMAIL_BRAND.siteUrl,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  return { subject: input.subject, html, text };
}

export async function sendBrandedEmail(opts: {
  to: string | string[];
  email: BrandedEmail;
  from?: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email] (dev, no RESEND) ${opts.email.subject} -> ${opts.to}`);
    }
    return false;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: opts.from || EMAIL_BRAND.from,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.email.subject,
    html: opts.email.html,
    text: opts.email.text,
  });
  if (error) {
    console.error("[email] send failed", error);
    return false;
  }
  return true;
}
