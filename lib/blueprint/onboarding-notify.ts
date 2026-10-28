/**
 * Admin-only notice when FAQ drafts are waiting.
 * Uses the portal admin destination. A customer inbox or a customer Telegram
 * chat is not a fallback. If that destination cannot be resolved, nothing is sent.
 */

import { CYCLE_REPAIR_LEAD_EMAIL, SAABAI_ADMIN_EMAIL, planPortalRequestAlert, type EnvLike } from "../notify-routing";

const BLOCKED_INBOXES = new Set([
  CYCLE_REPAIR_LEAD_EMAIL.toLowerCase(),
  "info@boconsulting.com.au",
  "hello@wholesalehomes.com.au",
]);

export type AdminFaqDestination = {
  emailTo: string;
  telegram: { token: string; chatId: string } | null;
};

export function adminFaqDestination(env: EnvLike = process.env, clientEmail?: string): AdminFaqDestination | null {
  const plan = planPortalRequestAlert({ priority: "new" }, env);
  const email = plan.emailTo.trim();
  const lower = email.toLowerCase();
  if (!email || !lower.includes("@")) return null;
  if (BLOCKED_INBOXES.has(lower)) return null;
  if (clientEmail && lower === clientEmail.trim().toLowerCase() && lower !== SAABAI_ADMIN_EMAIL.toLowerCase()) return null;
  return { emailTo: email, telegram: plan.telegram };
}

export async function notifyAdminFaqQueue(args: {
  firmName: string;
  engagementId: string;
  draftCount: number;
  unanswered: number;
  clientEmail?: string;
  env?: EnvLike;
  baseUrl?: string;
  sendEmail?: (to: string, subject: string, text: string) => Promise<boolean>;
  sendTelegram?: (token: string, chatId: string, text: string) => Promise<boolean>;
}): Promise<{ sent: boolean }> {
  const dest = adminFaqDestination(args.env ?? process.env, args.clientEmail);
  if (!dest) return { sent: false };
  const base = (args.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai").replace(/\/$/, "");
  const link = `${base}/saabai-admin/blueprint-faqs`;
  const text = [
    `Blueprint FAQ drafts are waiting for review: ${args.firmName}.`,
    `${args.draftCount} draft${args.draftCount === 1 ? "" : "s"}, ${args.unanswered} still unanswered.`,
    "Nothing has been published.",
    link,
  ].join("\n");
  const sendEmail = args.sendEmail ?? defaultEmail;
  const sendTelegram = args.sendTelegram ?? defaultTelegram;
  let emailOk = false;
  let telegramOk = false;
  try {
    emailOk = await sendEmail(dest.emailTo, `Blueprint FAQ drafts: ${args.firmName}`, text);
  } catch {
    emailOk = false;
  }
  if (dest.telegram) {
    try {
      telegramOk = await sendTelegram(dest.telegram.token, dest.telegram.chatId, text);
    } catch {
      telegramOk = false;
    }
  }
  return { sent: emailOk || telegramOk };
}

async function defaultEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  if (!key) return false;
  const { Resend } = await import("resend");
  const { error } = await new Resend(key).emails.send({
    from: "Saabai Audits <hello@saabai.ai>",
    to,
    subject,
    text,
  });
  return !error;
}

async function defaultTelegram(token: string, chatId: string, text: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.ok;
}
