/**
 * Marketing broadcasts to subscribers who ticked "occasional Saabai tips" (Spam Act 2003).
 * Pure builder: the route passes in the real suppression check and unsubscribe helpers,
 * tests pass mocks. Every email identifies the sender, says why it was sent, and carries
 * a working unsubscribe link plus RFC 8058 one-click headers.
 */
import { escapeHtml } from "./html-escape";
import { canReceiveMarketing, type Subscriber } from "./subscribers";

const ABN = "71 889 082 572";

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
  headers: Record<string, string>;
};

export function broadcastEmail(
  s: Pick<Subscriber, "email" | "firstName">,
  msg: { subject: string; html: string; fromName: string },
  deps: Pick<BroadcastDeps, "unsubUrl" | "unsubHeaders">,
): BroadcastEmail {
  const body = msg.html.replace(/\{\{firstName\}\}/g, escapeHtml(s.firstName || "there"));
  const fromName = msg.fromName.replace(/[<>"\r\n]/g, "").trim() || "Shane at Saabai";
  return {
    from: `${fromName} <hello@saabai.ai>`,
    to: [s.email],
    subject: msg.subject,
    html: withTipsFooter(body, deps.unsubUrl(s.email)),
    headers: deps.unsubHeaders(s.email),
  };
}
