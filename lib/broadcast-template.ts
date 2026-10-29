/**
 * The admin broadcast email layout (#345), shared by the composer preview and the send.
 * Client-safe. The compliance footer (sender, ABN, why, unsubscribe) is NOT here: the server
 * adds it to every email in broadcastEmail(), and the preview uses that same builder, so what
 * Shane sees is what subscribers get. There is no second footer line in this layout.
 */
import { escapeHtml } from "./html-escape";
import { broadcastEmail, type BroadcastEmail } from "./broadcast";
import { buildBroadcastTestEmail } from "./broadcast-test";
import type { MergeValues } from "./personalise";

export const BROADCAST_FROM_NAME = "Shane at Saabai";
export const BROADCAST_FROM = `${BROADCAST_FROM_NAME} <hello@saabai.ai>`;
export const MAX_SUBJECT = 200;

/** Message text (one paragraph per line, escaped) inside the Saabai email card. Tokens such as {{firstName|there}} pass through. */
export function buildBroadcastHtml(rawBody: string): string {
  const paragraphs = rawBody
    .split("\n")
    .map((l) => escapeHtml(l))
    .map((l) => `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.75;">${l || "&nbsp;"}</p>`)
    .join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background:#0b092e;padding:24px 36px;">
    <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Saabai.ai</p>
  </td></tr>
  <tr><td style="padding:32px 36px 24px;">${paragraphs}</td></tr>
</table></td></tr></table></body></html>`;
}

// Placeholder link for the preview only. Real sends get each person's signed link on the server.
const PREVIEW_DEPS = {
  unsubUrl: () => "https://saabai.ai/unsubscribe",
  unsubHeaders: () => ({}),
};

/** Exactly what one recipient gets (their own field values, server footer), for the live preview. */
export function previewForRecipient(sub: { email: string } & MergeValues, subject: string, body: string): BroadcastEmail {
  return broadcastEmail(sub, { subject, html: buildBroadcastHtml(body), fromName: BROADCAST_FROM_NAME }, PREVIEW_DEPS);
}

/** Exactly what the hello@saabai.ai test gets: [TEST] subject and the fixed sample values. */
export function previewForTest(subject: string, body: string): BroadcastEmail {
  return buildBroadcastTestEmail({ subject, html: buildBroadcastHtml(body), fromName: BROADCAST_FROM_NAME }, PREVIEW_DEPS);
}
