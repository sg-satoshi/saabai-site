/**
 * "Email me the link" from the exit pop-up: one email with the free AI score link.
 * Replaces the retired AI Readiness checklist email. The route wires in the real
 * storage and Resend calls; tests pass mocks.
 */
import { entitySender } from "@/lib/entity";
import { escapeHtml } from "./html-escape";
import { validEmail } from "./exit-popup";

export const SCORE_LINK_URL = "https://www.saabai.ai/score?from=exit-email";
export const SCORE_LINK_SUBJECT = "Your free AI score link";
export const SCORE_LINK_RATE_SECONDS = 24 * 60 * 60;

export function scoreLinkFooterHtml(unsubUrl: string): string {
  return `<p style="font-size:12px;color:#8a8fa8;margin-top:28px;border-top:1px solid #e8e8ec;padding-top:14px;line-height:1.6">You're getting this because you asked for your AI score link on saabai.ai. Sent by ${entitySender()} (saabai.ai, hello@saabai.ai). <a href="${escapeHtml(unsubUrl)}" style="color:#1595a6">Unsubscribe</a> and we won't email you again.</p>`;
}

export function scoreLinkEmailHtml(unsubUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#13152a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;border:1px solid #e8e8ec"><tr><td style="padding:32px 32px 28px;font-size:15px;line-height:1.7">
<p style="margin:0 0 16px">Hi there,</p>
<p style="margin:0 0 16px">Here is your link to the free AI Readiness Score: <a href="${SCORE_LINK_URL}" style="color:#1595a6;font-weight:600">${SCORE_LINK_URL}</a></p>
<p style="margin:0 0 16px">Twelve questions, about 3 minutes. You get a score out of 100 and three quick wins straight away, on screen.</p>
<p style="margin:0 0 16px">Got a question? Just reply. We usually reply within 1 business day.</p>
<p style="margin:0">Shane, Saabai</p>
${scoreLinkFooterHtml(unsubUrl)}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

export function scoreLinkEmailText(unsubUrl: string): string {
  return [
    "Hi there,",
    "",
    `Here is your link to the free AI Readiness Score: ${SCORE_LINK_URL}`,
    "",
    "Twelve questions, about 3 minutes. You get a score out of 100 and three quick wins straight away, on screen.",
    "",
    "Got a question? Just reply. We usually reply within 1 business day.",
    "",
    "Shane, Saabai",
    "",
    `You're getting this because you asked for your AI score link on saabai.ai. Sent by ${entitySender()}. Unsubscribe: ${unsubUrl}`,
  ].join("\n");
}

export interface ScoreLinkDeps {
  isSuppressed(email: string): Promise<boolean>;
  /** True if this address may get a score-link email now (one per 24 hours). Null when storage is down. */
  claimRateSlot(email: string): Promise<boolean | null>;
  /** Give the slot back when the send fails, so the visitor can try again. */
  releaseRateSlot(email: string): Promise<void>;
  /** Store the sign-up. Returns false when storage is unavailable. */
  save(rec: { email: string; source: string; marketingConsent: boolean; ip?: string }): Promise<boolean>;
  send(msg: { to: string; subject: string; html: string; text: string; headers: Record<string, string> }): Promise<boolean>;
  unsubUrl(email: string): string;
  unsubHeaders(email: string): Record<string, string>;
  /** Internal alert to hello@saabai.ai, one per sign-up (kept as today). Must not throw. */
  notify(info: { email: string; source: string; marketingConsent: boolean; stored: boolean }): Promise<void>;
}

export type ScoreLinkResult =
  | { status: 200; body: { ok: true; sent: true } }
  | { status: 200; body: { ok: true; sent: false; reason: "suppressed" | "rate_limited" } }
  | { status: 400; body: { ok: false; error: string } }
  | { status: 502; body: { ok: false; sent: false; error: string } };

export async function handleScoreLink(
  input: { email?: unknown; marketingConsent?: unknown; source?: unknown; ip?: string },
  deps: ScoreLinkDeps,
): Promise<ScoreLinkResult> {
  const raw = typeof input.email === "string" ? input.email : "";
  if (!validEmail(raw)) return { status: 400, body: { ok: false, error: "valid email required" } };
  const email = raw.trim().toLowerCase();
  const marketingConsent = input.marketingConsent === true;
  const source = typeof input.source === "string" ? input.source.slice(0, 80).replace(/[^\w/.-]/g, "") || "website" : "website";

  if (await deps.isSuppressed(email)) return { status: 200, body: { ok: true, sent: false, reason: "suppressed" } };

  const slot = await deps.claimRateSlot(email);
  if (slot === false) return { status: 200, body: { ok: true, sent: false, reason: "rate_limited" } };

  // Storage down: still send the link they asked for, but record nothing (so no marketing consent).
  const stored = slot === null ? false : await deps.save({ email, source, marketingConsent, ip: input.ip });

  const url = deps.unsubUrl(email);
  const ok = await deps.send({
    to: email,
    subject: SCORE_LINK_SUBJECT,
    html: scoreLinkEmailHtml(url),
    text: scoreLinkEmailText(url),
    headers: deps.unsubHeaders(email),
  });
  if (!ok) {
    if (slot === true) await deps.releaseRateSlot(email);
    return { status: 502, body: { ok: false, sent: false, error: "send failed" } };
  }

  await deps.notify({ email, source, marketingConsent: stored && marketingConsent, stored });
  return { status: 200, body: { ok: true, sent: true } };
}
