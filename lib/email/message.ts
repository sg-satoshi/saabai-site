/**
 * SUNDER marketing email. Client-safe: the admin preview and the sender use the
 * same builder. The footer cannot be removed. Personalisation is {{firstName|there}}.
 */
import { escapeHtml } from "../html-escape";
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
    <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:0.14em;color:#ffffff;">SUNDER</p>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;">${paragraphs}${extraHtml}</td></tr>
</table></td></tr></table></body></html>`;
}

export function footerHtml(identity: SenderIdentity, unsubUrl: string): string {
  return `<p style="font-size:12px;color:#5f6580;margin:8px 32px 28px;border-top:1px solid #eceef4;padding-top:14px;line-height:1.6;">You're getting this because ${escapeHtml(identity.whyText)}. Sent by ${escapeHtml(identity.legalName)}, ABN ${escapeHtml(identity.abn)}, ${escapeHtml(identity.postalAddress)} (${escapeHtml(identity.domain)}, ${escapeHtml(identity.fromEmail)}). <a href="${escapeHtml(unsubUrl)}" style="color:#111;">Unsubscribe</a>.</p>`;
}

export function footerText(identity: SenderIdentity, unsubUrl: string): string {
  return `You're getting this because ${identity.whyText}. Sent by ${identity.legalName}, ABN ${identity.abn}, ${identity.postalAddress} (${identity.domain}, ${identity.fromEmail}). Unsubscribe: ${unsubUrl}`;
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
  values?: MergeValues;
  confirmUrl?: string;
}): RenderedEmail {
  const values = input.values ?? {};
  const withLink = input.confirmUrl ? applyConfirmUrl(input.html, input.confirmUrl) : input.html;
  const body = personaliseHtml(withLink, values);
  const footer = footerHtml(input.identity, input.unsubUrl);
  const subject = personaliseText(input.subject, values).slice(0, 200);
  const textBody = htmlToText(input.confirmUrl ? applyConfirmUrl(input.html, input.confirmUrl) : input.html)
    .split("\n")
    .map((line) => personaliseText(line, values))
    .join("\n");
  return {
    from: formatFrom(cleanFromName(input.fromName, input.identity.fromName), input.identity.fromEmail),
    subject,
    html: withFooter(body, footer),
    text: `${textBody}\n\n${footerText(input.identity, input.unsubUrl)}\n`,
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

export function listUnsubscribeHeader(httpsUrl: string, mailto: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${httpsUrl}>, <${mailto}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
