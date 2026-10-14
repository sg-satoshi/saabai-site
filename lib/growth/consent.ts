/** Marketing consent: signed unsubscribe links and a suppression list (Spam Act 2003). */
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDoc, putDoc, type Doc } from "./store";
import { contactKey, recordEvent } from "./events";

const secret = () => process.env.SAABAI_SESSION_SECRET || "";
export const unsubToken = (email: string) => createHmac("sha256", secret()).update(`unsub:${contactKey(email)}`).digest("base64url").slice(0, 32);

export function verifyUnsub(email: string, token: string): boolean {
  if (!secret() || !email || !token) return false;
  const a = Buffer.from(unsubToken(email)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unsubUrl = (email: string) => `https://saabai.ai/unsubscribe?e=${encodeURIComponent(contactKey(email))}&t=${unsubToken(email)}`;

export async function isSuppressed(email: string): Promise<boolean> {
  return !!(await getDoc("suppressions", contactKey(email)));
}

export async function suppress(email: string, channel: "email" | "sms" | "all" = "all", reason = "unsubscribe_link"): Promise<void> {
  const id = contactKey(email);
  await putDoc<Doc>("suppressions", { id, channel, reason });
  await recordEvent({ contactId: id, type: "unsubscribed", meta: { channel, reason } });
}

/** Footer for marketing email: identifies the sender and gives a working unsubscribe. */
export function marketingFooterHtml(email: string): string {
  return `<p style="font-size:12px;color:#5f6580;margin-top:28px;border-top:1px solid #eceef4;padding-top:14px">You're getting this because you bought a Saabai Blueprint. Sent by Saabai (saabai.ai, hello@saabai.ai). <a href="${unsubUrl(email)}" style="color:#1595a6">Unsubscribe</a> from marketing emails. You'll still get receipts and service messages.</p>`;
}
export const SMS_STOP = "Reply STOP to opt out";
