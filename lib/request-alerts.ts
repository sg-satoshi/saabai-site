/**
 * Critical request alerts: branded email, and Telegram only when an admin chat
 * is configured. Email buttons open Mission Control and require admin sign-in.
 * A missing admin chat does not fall through to a customer bot.
 */
import { EMAIL_BRAND, escapeHtml, renderBrandedEmail, sendBrandedEmail } from "./email/branded-layout";
import type { ClientRequest } from "./client-requests";
import { TYPE_LABELS } from "./client-requests";
import { planPortalRequestAlert } from "./notify-routing";

export function criticalAlertEmail(req: ClientRequest, to: string) {
  const adminUrl = `https://www.saabai.ai/saabai-admin/requests?id=${encodeURIComponent(req.id)}`;
  const takeOverUrl = `${adminUrl}&takeOver=1`;
  const email = renderBrandedEmail({
    subject: `CRITICAL: ${req.title.slice(0, 80)}`,
    preheader: `${req.siteName || req.clientName} · Chief has picked this up.`,
    eyebrow: "Critical request",
    title: "Critical site issue",
    bodyHtml: [
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;"><strong style="color:#c2261d;">CRITICAL</strong> from ${escapeHtml(req.clientName || req.clientEmail)}${req.siteName ? ` · ${escapeHtml(req.siteName)}` : ""}</p>`,
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.65;color:#13152a;"><strong>${escapeHtml(req.title)}</strong></p>`,
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#13152a;">${escapeHtml(req.description).replace(/\n/g, "<br>")}</p>`,
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#4e546c;">A client marked this request Critical. <strong style="color:#13152a;">Chief has picked this up</strong> and is auto-handling it. Chief will escalate to Shane only if his input is needed.</p>`,
      `<p style="margin:0;font-size:13px;color:#5f6580;">Type: ${escapeHtml(TYPE_LABELS[req.type])} · Handling: <strong style="color:#0e7482;">Chief AI</strong>, auto-handling</p>`,
    ].join(""),
    cta: { href: adminUrl, label: "View in Mission Control" },
    secondaryCta: { href: takeOverUrl, label: "Take over" },
    textBody: [
      `CRITICAL from ${req.clientName || req.clientEmail}`,
      req.title,
      "",
      req.description,
      "",
      "Chief has picked this up and is auto-handling it.",
      `View: ${adminUrl}`,
      `Take over: ${takeOverUrl}`,
    ],
  });
  return { to, email, adminUrl, takeOverUrl };
}

export async function sendCriticalAlerts(
  req: ClientRequest,
  opts?: { emailTo?: string },
): Promise<{ email: boolean; telegram: boolean }> {
  const plan = planPortalRequestAlert(req);
  const to = opts?.emailTo || plan.emailTo;
  const { email, adminUrl } = criticalAlertEmail(req, to);
  const emailOk = await sendBrandedEmail({
    to,
    email,
    from: EMAIL_BRAND.fromShane,
    replyTo: EMAIL_BRAND.supportEmail,
  });

  let telegramOk = false;
  const tg = plan.telegram;
  if (tg) {
    const text = [
      "CRITICAL request · Chief AI auto-handling",
      req.siteName || req.clientName,
      req.title,
      "",
      req.description.slice(0, 800),
      "",
      adminUrl,
    ].join("\n");
    try {
      const res = await fetch(`https://api.telegram.org/bot${tg.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tg.chatId, text }),
      });
      telegramOk = res.ok;
      if (!res.ok) console.error("[request-alerts] telegram", res.status, await res.text());
    } catch (err) {
      console.error("[request-alerts] telegram error", err);
    }
  } else {
    console.warn(`[request-alerts] ${plan.telegramSkip}`);
  }

  return { email: emailOk, telegram: telegramOk };
}
