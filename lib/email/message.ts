/**
 * SUNDER marketing email. Client-safe: the admin preview and the sender use the
 * same builder. The footer cannot be removed. Personalisation is {{firstName|there}}.
 */
import { escapeHtml } from "../html-escape";
import { SUNDER_LOGO_BLACK_URL, SUNDER_LOGO_URL } from "./blocks";
import { personaliseHtml, personaliseText, type MergeValues } from "../personalise";
import type { SenderIdentity } from "./constants";
import { cleanFromName, formatFrom } from "./rules";

export function buildSunderHtml(rawBody: string, extraHtml = ""): string {
  const paragraphs = rawBody.split("\n").map((line) => {
    const text = escapeHtml(line);
    return `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">${text || "&nbsp;"}</p>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media (max-width:480px){.sl{display:block!important;padding:0!important}.sl2{display:block!important;padding:6px 0 0!important}.sx{padding-left:20px!important;padding-right:20px!important}.sxf{margin-left:20px!important;margin-right:20px!important}}</style></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">
  <tr><td class="sx" style="background:#0d0d0d;padding:22px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="sl" style="vertical-align:middle;padding:0;"><img src="${SUNDER_LOGO_URL}" alt="SUNDER" width="120" style="display:block;width:120px;max-width:100%;height:auto;border:0;"></td><td class="sl2" style="vertical-align:middle;padding:0 0 0 8px;"><span style="font-family:'Inter Tight',Arial,Helvetica,sans-serif;font-size:16px;line-height:18px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#d4ff3a;">PICKLEBALL</span></td></tr></table>
  </td></tr>
  <tr><td class="sx" style="padding:28px 32px 8px;">${paragraphs}${extraHtml}</td></tr>
  <tr><td style="background:#f2f2ee;padding-top:8px;"><!--EMAIL_FOOTER--></td></tr>
</table></td></tr></table></body></html>`;
}

export function footerHtml(identity: SenderIdentity, unsubUrl: string, viewUrl?: string): string {
  const view = viewUrl ? ` &nbsp;·&nbsp; <a href="${escapeHtml(viewUrl)}" style="color:#111111;display:inline-block;padding:10px 0;">View in browser</a>` : "";
  return `<div class="sxf" style="margin:8px 40px 28px;padding-top:16px;border-top:1px solid #d9d9d2;font-family:'Inter Tight',Arial,sans-serif;font-size:12.5px;line-height:1.55;color:#4b4b45;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;"><tr><td style="vertical-align:middle;padding:0;"><img src="${SUNDER_LOGO_BLACK_URL}" alt="SUNDER" width="88" style="display:block;width:88px;max-width:100%;height:auto;border:0;"></td><td style="vertical-align:middle;padding:0 0 0 7px;"><span style="font-family:'Inter Tight',Arial,Helvetica,sans-serif;font-size:11px;line-height:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b64;">PICKLEBALL</span></td></tr></table>You are getting this because ${escapeHtml(identity.whyText)}. Sent by ${escapeHtml(identity.legalName)} for Sunder Pickleball, ABN ${escapeHtml(identity.abn)}, ${escapeHtml(identity.postalAddress)}. Contact: <a href="mailto:${escapeHtml(identity.replyTo)}" style="color:#111111;display:inline-block;padding:10px 0;">${escapeHtml(identity.replyTo)}</a>.<br><a href="${escapeHtml(unsubUrl)}" style="color:#111111;display:inline-block;padding:10px 0;">Unsubscribe</a> in one click${view}</div>`;
}

export function footerText(identity: SenderIdentity, unsubUrl: string, viewUrl?: string): string {
  const view = viewUrl ? `\nView in browser: ${viewUrl}` : "";
  return `You are getting this because ${identity.whyText}. Sent by ${identity.legalName} for Sunder Pickleball, ABN ${identity.abn}, ${identity.postalAddress}. Contact: ${identity.replyTo}. Unsubscribe in one click: ${unsubUrl}${view}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, "").trim();
      return label ? `${label} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Put the footer inside the body when there is one, else append it. */
export function withFooter(html: string, footer: string): string {
  if (html.includes("<!--EMAIL_FOOTER-->")) return html.replace("<!--EMAIL_FOOTER-->", footer);
  const i = html.toLowerCase().lastIndexOf("</body>");
  return i >= 0 ? html.slice(0, i) + footer + html.slice(i) : html + footer;
}

const FOOTER_ROW = '<tr><td style="background:#f2f2ee;padding-top:8px;"><!--EMAIL_FOOTER-->';

/** Adds the referral line (counts only) as its own row above the footer. */
export function withReferralLine(html: string, line: string | null, statusUrl?: string | null): string {
  if (!line) return html;
  const check = statusUrl ? ` · <a href="${escapeHtml(statusUrl)}" style="color:#0d0d0d;font-weight:700;">Check your referrals</a>` : "";
  const p = `<p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.6;">${escapeHtml(line)}${check}</p>`;
  if (html.includes(FOOTER_ROW)) return html.replace(FOOTER_ROW, `<tr><td class="sx" style="padding:0 32px 14px;">${p}</td></tr>\n  ${FOOTER_ROW}`);
  return withFooter(html, p + "<!--EMAIL_FOOTER-->");
}

export function applyConfirmUrl(html: string, url: string): string {
  return html.replaceAll("{{confirmUrl}}", escapeHtml(url));
}

export type RenderedEmail = {
  from: string;
  subject: string;
  html: string;
  text: string;
};

export function renderMarketingEmail(input: {
  subject: string;
  html: string;
  fromName: string;
  identity: SenderIdentity;
  unsubUrl: string;
  viewUrl?: string;
  values?: MergeValues;
  confirmUrl?: string;
}): RenderedEmail {
  const values = input.values ?? {};
  const withLink = input.confirmUrl ? applyConfirmUrl(input.html, input.confirmUrl) : input.html;
  const body = personaliseHtml(withLink, values);
  const footer = footerHtml(input.identity, input.unsubUrl, input.viewUrl);
  const subject = personaliseText(input.subject, values).slice(0, 200);
  const textBody = htmlToText(input.confirmUrl ? applyConfirmUrl(input.html, input.confirmUrl) : input.html)
    .split("\n")
    .map((line) => personaliseText(line, values))
    .join("\n");
  return {
    from: formatFrom(cleanFromName(input.fromName, input.identity.fromName), input.identity.fromEmail),
    subject,
    html: withFooter(body, footer),
    text: `${textBody}\n\n${footerText(input.identity, input.unsubUrl, input.viewUrl)}\n`,
  };
}

export function confirmMessage(): { subject: string; html: string } {
  const lines = [
    "Hi {{firstName|there}},",
    "Tap the button below and you're on the SUNDER VIP list. You'll be first to hear about the launch, offers and our giveaways.",
  ];
  const button = `<p style="margin:8px 0 22px;"><a href="{{confirmUrl}}" style="display:inline-block;background:#d4ff3a;color:#0d0d0d;padding:14px 22px;line-height:20px;min-height:44px;box-sizing:border-box;border-radius:8px;text-decoration:none;font-weight:800;">Join the SUNDER VIP list</a></p>`;
  return { subject: "Confirm your SUNDER email", html: buildSunderHtml(lines.join("\n"), button) };
}

/** "Check my referrals": the private status link, by email only. */
export function referralLinkMessage(statusUrl: string): { subject: string; html: string } {
  const lines = [
    "Hi {{firstName|there}},",
    "Here's your private SUNDER referral link. Open it any time to see how many friends have joined and your bonus giveaway entries.",
  ];
  const safe = statusUrl.replace(/[^A-Za-z0-9:/._-]/g, "");
  const button = `<p style="margin:8px 0 22px;"><a href="${safe}" style="display:inline-block;background:#d4ff3a;color:#0d0d0d;padding:14px 22px;line-height:20px;min-height:44px;box-sizing:border-box;border-radius:8px;text-decoration:none;font-weight:800;">Check my referrals</a></p><p style="margin:0 0 14px;font-size:14px;color:#374151;">Keep this link to yourself. Didn't ask for it? You can ignore this email.</p>`;
  return { subject: "Your SUNDER referral link", html: buildSunderHtml(lines.join("\n"), button) };
}

/**
 * mailto is only a fallback address for mail clients. Nothing reads that inbox automatically.
 * The HTTPS one-click POST is what unsubscribes immediately.
 */
export function listUnsubscribeHeader(httpsUrl: string, mailto: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${httpsUrl}>, <${mailto}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
