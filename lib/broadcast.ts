/**
 * Marketing broadcasts to subscribers who ticked "occasional Saabai tips" (Spam Act 2003).
 * Pure builder: the route passes in the real suppression check and unsubscribe helpers,
 * tests pass mocks. Every email identifies the sender, says why it was sent, and carries
 * a working unsubscribe link plus RFC 8058 one-click headers.
 */
import { escapeHtml } from "./html-escape";
import { canReceiveMarketing, type Subscriber } from "./subscribers";
import { personaliseHtml, personaliseText, valuesFor, type MergeValues } from "./personalise";

const ABN = "71 889 082 572";

/** Plain-text version of the compliance footer, with the full unsubscribe URL. */
export function tipsFooterText(unsubUrl: string): string {
  return `You're getting this because you asked for occasional Saabai tips by email on saabai.ai. Sent by Saabai, ABN ${ABN}, Merrimac QLD 4226, Australia (saabai.ai, hello@saabai.ai). Unsubscribe and we won't email you again: ${unsubUrl}`;
}

// The retired footer row ("You're receiving this as a Saabai subscriber"). The admin editor no
// longer adds it; this also removes it from HTML built by an older admin tab, so only the
// compliance footer is ever sent.
const LEGACY_FOOTER_ROW = /<tr>\s*<td[^>]*>\s*<p[^>]*>\s*You(?:'|&#39;|&apos;|\u2019)re receiving this as a Saabai subscriber[\s\S]*?<\/p>\s*<\/td>\s*<\/tr>/gi;
const LEGACY_FOOTER_P = /<p[^>]*>\s*You(?:'|&#39;|&apos;|\u2019)re receiving this as a Saabai subscriber[\s\S]*?<\/p>/gi;

export function stripLegacyFooter(html: string): string {
  return html.replace(LEGACY_FOOTER_ROW, "").replace(LEGACY_FOOTER_P, "");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_m, n: string) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => { const c = parseInt(h, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Plain text from the broadcast HTML: one line per paragraph or break, links kept as
 * "text (url)", head/style/script dropped, blank runs collapsed to one empty line.
 */
export function broadcastHtmlToText(html: string): string {
  const t = html
    .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, "").trim();
      const url = decodeEntities(href).trim();
      if (!label) return url;
      return decodeEntities(label) === url ? label : `${label} (${url})`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(t)
    .split("\n")
    .map((l) => l.replace(/[ \t\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function tipsFooterHtml(unsubUrl: string): string {
  return `<p style="font-size:12px;color:#8a8fa8;margin-top:28px;border-top:1px solid #e8e8ec;padding-top:14px;line-height:1.6">You're getting this because you asked for occasional Saabai tips by email on saabai.ai. Sent by Saabai, ABN ${ABN}, Merrimac QLD 4226, Australia (saabai.ai, hello@saabai.ai). <a href="${escapeHtml(unsubUrl)}" style="color:#1595a6">Unsubscribe</a> and we won't email you again.</p>`;
}

/** Put the footer inside the body when there is one, else append it. */
export function withTipsFooter(html: string, unsubUrl: string): string {
  const footer = tipsFooterHtml(unsubUrl);
  const i = html.toLowerCase().lastIndexOf("</body>");
  return i >= 0 ? html.slice(0, i) + footer + html.slice(i) : html + footer;
}

export type BroadcastDeps = {
  isSuppressed: (email: string) => Promise<boolean>;
  unsubUrl: (email: string) => string;
  unsubHeaders: (email: string) => Record<string, string>;
};

/** Opted-in, active subscribers from the selection, minus anyone on the suppression list. */
export async function broadcastRecipients(
  emails: string[],
  subs: Subscriber[],
  isSuppressed: BroadcastDeps["isSuppressed"],
): Promise<{ recipients: Subscriber[]; suppressed: number }> {
  const subMap = new Map(subs.map((s) => [s.email.toLowerCase(), s]));
  const seen = new Set<string>();
  const eligible: Subscriber[] = [];
  for (const e of emails) {
    const key = String(e || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const s = subMap.get(key);
    if (s && canReceiveMarketing(s)) eligible.push(s);
  }
  const recipients: Subscriber[] = [];
  let suppressed = 0;
  for (const s of eligible) {
    let blocked: boolean;
    // If the suppression check cannot be read, do not send to that person.
    try { blocked = await isSuppressed(s.email); } catch { blocked = true; }
    if (blocked) suppressed++;
    else recipients.push(s);
  }
  return { recipients, suppressed };
}

export type BroadcastEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  /** Plain-text alternative, same personalised content, footer and unsubscribe URL. */
  text: string;
  headers: Record<string, string>;
};

/**
 * One recipient's email. Every offered personalisation token ({{firstName|there}} etc., see
 * lib/personalise.ts) is filled from that subscriber's own record, HTML-escaped in the body.
 * `values` overrides the record (the hello@ test send uses sample values).
 */
export function broadcastEmail(
  s: Pick<Subscriber, "email"> & MergeValues,
  msg: { subject: string; html: string; fromName: string },
  deps: Pick<BroadcastDeps, "unsubUrl" | "unsubHeaders">,
  values: MergeValues = valuesFor(s),
): BroadcastEmail {
  const body = stripLegacyFooter(personaliseHtml(msg.html, values));
  const unsub = deps.unsubUrl(s.email);
  // Text part: tokens resolved line by line (personaliseText flattens line breaks).
  const bodyText = broadcastHtmlToText(stripLegacyFooter(msg.html)).split("\n").map((l) => personaliseText(l, values).replace(/[ \t]+/g, " ").trim()).join("\n");
  const fromName = msg.fromName.replace(/[<>"\r\n]/g, "").trim() || "Shane at Saabai";
  return {
    from: `${fromName} <hello@saabai.ai>`,
    to: [s.email],
    subject: personaliseText(msg.subject, values),
    html: withTipsFooter(body, unsub),
    text: `${bodyText}\n\n${tipsFooterText(unsub)}\n`,
    headers: deps.unsubHeaders(s.email),
  };
}
