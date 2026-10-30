/** Sends that only ever run from an admin approve action. */
import { Resend } from "resend";
import { escapeHtml } from "../html-escape";
import { isSuppressed, marketingFooterHtml, unsubUrl } from "./consent";
import { ENTITY_SENDER } from "../entity";

const textToHtml = (t: string) =>
  escapeHtml(t).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>").replace(/(https:\/\/saabai\.ai[^\s<]*)/g, '<a href="$1" style="color:#1595a6">$1</a>')}</p>`).join("");

export async function sendMarketingEmail(to: string, subject: string, text: string, tag: string): Promise<{ ok: boolean; error?: string }> {
  if (await isSuppressed(to)) return { ok: false, error: "This contact has unsubscribed from marketing" };
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Email not configured" };
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#13152a;font-size:15px;line-height:1.6">${textToHtml(text)}${marketingFooterHtml(to)}</div>`;
  const r = await new Resend(key).emails.send({
    from: process.env.MARKETING_FROM_EMAIL || "Shane at Saabai <hello@saabai.ai>", to: [to], replyTo: "hello@saabai.ai", subject, html,
    text: `${text}\n\n${ENTITY_SENDER}, Merrimac QLD 4226, Australia\nUnsubscribe: ${unsubUrl(to)}`,
    headers: { "List-Unsubscribe": `<${unsubUrl(to)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    tags: [{ name: "kind", value: "marketing" }, { name: "flow", value: tag }],
  });
  return r.error ? { ok: false, error: "Send failed" } : { ok: true };
}
