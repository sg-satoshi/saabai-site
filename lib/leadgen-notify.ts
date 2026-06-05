/**
 * LeadGen Notification Service
 *
 * Sends lead capture alerts via Resend email.
 * Future: add SMS via Twilio/Telnyx.
 */

import { Resend } from "resend";
import type { LeadGenClient, LeadCapture } from "./leadgen-config";

const RESEND_KEY = process.env.RESEND_API_KEY || "";

function getResend(): Resend {
  return new Resend(RESEND_KEY);
}

function urgencyLabel(u: string): string {
  switch (u) {
    case "emergency": return "🚨 EMERGENCY";
    case "soon": return "⏰ Soon";
    case "quote": return "💰 Quote Request";
    default: return "📋 Lead";
  }
}

function buildEmailHtml(client: LeadGenClient, lead: LeadCapture): string {
  const urgency = urgencyLabel(lead.urgency);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 560px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 24px; color: #fff; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 4px 0 0; opacity: 0.8; font-size: 14px; }
    .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 8px; }
    .urgency-badge.emergency { background: #dc2626; color: #fff; }
    .urgency-badge.soon { background: #f59e0b; color: #000; }
    .urgency-badge.quote { background: #6366f1; color: #fff; }
    .body { padding: 24px; }
    .field { margin-bottom: 16px; }
    .field-label { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 4px; }
    .field-value { font-size: 16px; font-weight: 500; color: #111; }
    .footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${client.businessName}</h1>
      <p>New lead captured on your website</p>
      <div class="urgency-badge ${lead.urgency}">${urgency}</div>
    </div>
    <div class="body">
      <div class="field">
        <div class="field-label">Name</div>
        <div class="field-value">${lead.name}</div>
      </div>
      <div class="field">
        <div class="field-label">Phone</div>
        <div class="field-value"><a href="tel:${lead.phone}" style="color:#2563eb">${lead.phone}</a></div>
      </div>
      ${lead.email ? `<div class="field">
        <div class="field-label">Email</div>
        <div class="field-value"><a href="mailto:${lead.email}" style="color:#2563eb">${lead.email}</a></div>
      </div>` : ""}
      <div class="field">
        <div class="field-label">Service Needed</div>
        <div class="field-value">${lead.service}</div>
      </div>
      ${lead.address ? `<div class="field">
        <div class="field-label">Address</div>
        <div class="field-value">${lead.address}</div>
      </div>` : ""}
      ${lead.message ? `<div class="field">
        <div class="field-label">Notes</div>
        <div class="field-value">${lead.message}</div>
      </div>` : ""}
    </div>
    <div class="footer">
      LeadGen AI — Captured at ${new Date(lead.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })}
    </div>
  </div>
</body>
</html>`;
}

export async function sendLeadNotification(
  client: LeadGenClient,
  lead: LeadCapture
): Promise<boolean> {
  try {
    if (!RESEND_KEY) {
      console.warn("[leadgen-notify] RESEND_API_KEY not set — skipping email");
      return false;
    }

    const resend = getResend();
    const urgency = urgencyLabel(lead.urgency);
    const subject = `${urgency} — ${lead.name} needs ${lead.service}`;

    await resend.emails.send({
      from: `LeadGen <leads@saabai.ai>`,
      to: client.email,
      subject,
      html: buildEmailHtml(client, lead),
    });

    console.log(`[leadgen-notify] Lead ${lead.id} sent to ${client.email}`);
    return true;
  } catch (e) {
    console.error("[leadgen-notify] Failed to send notification:", e);
    return false;
  }
}
