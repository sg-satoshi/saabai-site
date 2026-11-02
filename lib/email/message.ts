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
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">
  <tr><td style="background:#111111;padding:22px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:middle;padding:0;"><img src="${SUNDER_LOGO_URL}" alt="SUNDER" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;"></td><td style="vertical-align:middle;padding:0 0 0 10px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:22px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#d4ff3a;">PICKLEBALL</span></td></tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;">${paragraphs}${extraHtml}</td></tr>
  <tr><td style="background:#f2f2ee;padding-top:8px;"><!--EMAIL_FOOTER--></td></tr>
</table></td></tr></table></body></html>`;
}

export function footerHtml(identity: SenderIdentity, unsubUrl: string, viewUrl?: string): string {
  const view = viewUrl ? ` &nbsp;·&nbsp; <a href="${escapeHtml(viewUrl)}" style="color:#111111;">View in browser</a>` : "";
  return `<p style="margin:8px 40px 28px;padding-top:16px;border-top:1px solid #d9d9d2;font-family:Inter Tight, Arial, sans-serif;font-size:12.5px;line-height:1.55;color:#4b4b45;"><img src="${SUNDER_LOGO_BLACK_URL}" alt="Sunder Pickleball" width="96" style="display:block;width:96px;max-width:96px;height:auto;border:0;margin:0 0 6px;"><strong style="color:#111111;">Sunder Pickleball</strong><br>You are getting this because ${escapeHtml(identity.whyText)}. Sent by ${escapeHtml(identity.legalName)} for Sunder Pickleball, ABN ${escapeHtml(identity.abn)}, ${escapeHtml(identity.postalAddress)}. Contact: <a href="mailto:${escapeHtml(identity.replyTo)}" style="color:#111111;">${escapeHtml(identity.replyTo)}</a>.<br><a href="${escapeHtml(unsubUrl)}" style="color:#111111;">Unsubscribe</a> in one click${view}</p>`;
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
    "Confirm this address and we'll email you about the SUNDER launch, offers and the giveaway.",
    "Until you confirm, you won't get marketing from us.",
  ];
  const button = `<p style="margin:8px 0 22px;"><a href="{{confirmUrl}}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Confirm your email</a></p>`;
  return { subject: "Confirm your SUNDER email", html: buildSunderHtml(lines.join("\n"), button) };
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
