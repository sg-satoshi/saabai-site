/**
 * LeadGen Notification Service
 *
 * Three-channel notification system: email, SMS, WhatsApp.
 * Tracks usage against tier limits. NEVER blocks — overage is tracked separately.
 * Works without external API keys — logs instead of sending when keys missing.
 *
 * Wire in real API keys when ready:
 *   RESEND_API_KEY          → email    (Resend)
 *   MESSAGEMEDIA_KEY        → SMS      (MessageMedia)
 *   MESSAGEMEDIA_SECRET     → SMS      (MessageMedia)
 *   WHATSAPP_API_KEY        → WhatsApp (MessageMedia Conversation API)
 *   STRIPE_TOPUP_PRICE_ID   → overage  (Stripe product for top-up purchases)
 */

import type { LeadGenClient, LeadCapture } from "./leadgen-config";
import { TIER_LIMITS, getUsageKey, OVERAGE } from "./leadgen-tiers";
import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ── Channel Config ───────────────────────────────────────────────────────────

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const MM_KEY = process.env.MESSAGEMEDIA_KEY || "";
const MM_SECRET = process.env.MESSAGEMEDIA_SECRET || "";
const WA_KEY = process.env.WHATSAPP_API_KEY || "";

function channelReady(channel: "email" | "sms" | "whatsapp"): boolean {
  switch (channel) {
    case "email":    return !!RESEND_KEY;
    case "sms":      return !!(MM_KEY && MM_SECRET);
    case "whatsapp": return !!WA_KEY;
  }
}

// ── Urgency Helpers ──────────────────────────────────────────────────────────

function urgencyLabel(u: string): string {
  switch (u) {
    case "emergency": return "🚨 EMERGENCY";
    case "soon":      return "⏰ Soon";
    case "quote":     return "💰 Quote";
    default:          return "📋 Lead";
  }
}

// ── Usage Tracking ───────────────────────────────────────────────────────────

export interface UsageData {
  sms: number;
  whatsapp: number;
  smsOverage: number;
  whatsappOverage: number;
  smsTopup: number;
  whatsappTopup: number;
}

async function getUsage(clientId: string): Promise<UsageData> {
  const redis = getRedis();
  if (!redis) return { sms: 0, whatsapp: 0, smsOverage: 0, whatsappOverage: 0, smsTopup: 0, whatsappTopup: 0 };
  const key = getUsageKey(clientId);
  try {
    const raw = await redis.hgetall<Record<string, string>>(key);
    if (!raw) return { sms: 0, whatsapp: 0, smsOverage: 0, whatsappOverage: 0, smsTopup: 0, whatsappTopup: 0 };
    return {
      sms:             parseInt(raw.sms ?? "0", 10),
      whatsapp:        parseInt(raw.whatsapp ?? "0", 10),
      smsOverage:      parseInt(raw.smsOverage ?? "0", 10),
      whatsappOverage: parseInt(raw.whatsappOverage ?? "0", 10),
      smsTopup:        parseInt(raw.smsTopup ?? "0", 10),
      whatsappTopup:   parseInt(raw.whatsappTopup ?? "0", 10),
    };
  } catch {
    return { sms: 0, whatsapp: 0, smsOverage: 0, whatsappOverage: 0, smsTopup: 0, whatsappTopup: 0 };
  }
}

async function incrementUsage(clientId: string, channel: "sms" | "whatsapp", isOverage: boolean): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = getUsageKey(clientId);
  try {
    if (isOverage) {
      await redis.hincrby(key, `${channel}Overage`, 1);
    } else {
      await redis.hincrby(key, channel, 1);
    }
    await redis.expire(key, 60 * 24 * 60 * 60);
  } catch { /* non-critical */ }
}

/**
 * Determine if the next message would be overage (exceeds plan + topup).
 */
async function isOverage(clientId: string, tier: "starter" | "pro" | "enterprise", channel: "sms" | "whatsapp"): Promise<boolean> {
  const usage = await getUsage(clientId);
  const limit = TIER_LIMITS[tier][channel] as number;
  const effective = limit + usage[`${channel}Topup` as keyof UsageData] as number;
  const used = usage[channel];
  return used >= effective;
}

// ── Resend Email ─────────────────────────────────────────────────────────────

async function sendEmail(client: LeadGenClient, lead: LeadCapture): Promise<boolean> {
  if (!channelReady("email")) {
    console.log("[notify] Email not configured — would send to", client.email);
    return true;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_KEY);
    const urgency = urgencyLabel(lead.urgency);

    await resend.emails.send({
      from: `LeadGen <leads@saabai.ai>`,
      to: client.email,
      subject: `${urgency} — ${lead.name} needs ${lead.service}`,
      html: buildEmailHtml(client, lead),
    });

    console.log(`[notify] Email sent to ${client.email} for lead ${lead.id}`);
    return true;
  } catch (e) {
    console.error("[notify] Email failed:", e);
    return false;
  }
}

function buildEmailHtml(client: LeadGenClient, lead: LeadCapture): string {
  const urgency = urgencyLabel(lead.urgency);
  const emClass = lead.urgency === "emergency" ? "emergency" : lead.urgency === "soon" ? "soon" : "quote";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 560px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 24px; color: #fff; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; opacity: 0.8; font-size: 14px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 8px; }
  .badge.emergency { background: #dc2626; color: #fff; }
  .badge.soon { background: #f59e0b; color: #000; }
  .badge.quote { background: #6366f1; color: #fff; }
  .body { padding: 24px; }
  .field { margin-bottom: 16px; }
  .label { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 4px; }
  .value { font-size: 16px; font-weight: 500; color: #111; }
  .footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
</style></head><body>
  <div class="container">
    <div class="header">
      <h1>${client.businessName}</h1>
      <p>New lead captured on your website</p>
      <div class="badge ${emClass}">${urgency}</div>
    </div>
    <div class="body">
      <div class="field"><div class="label">Name</div><div class="value">${escapeHtml(lead.name)}</div></div>
      <div class="field"><div class="label">Phone</div><div class="value"><a href="tel:${lead.phone}" style="color:#2563eb">${lead.phone}</a></div></div>
      ${lead.email ? `<div class="field"><div class="label">Email</div><div class="value"><a href="mailto:${lead.email}" style="color:#2563eb">${lead.email}</a></div></div>` : ""}
      <div class="field"><div class="label">Service Needed</div><div class="value">${escapeHtml(lead.service)}</div></div>
      ${lead.address ? `<div class="field"><div class="label">Address</div><div class="value">${escapeHtml(lead.address)}</div></div>` : ""}
      ${lead.message ? `<div class="field"><div class="label">Notes</div><div class="value">${escapeHtml(lead.message)}</div></div>` : ""}
    </div>
    <div class="footer">LeadGen AI — Captured at ${new Date(lead.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })}</div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── SMS via MessageMedia ────────────────────────────────────────────────────

async function sendSms(client: LeadGenClient, lead: LeadCapture): Promise<boolean> {
  const tier = client.subscription?.tier ?? "starter";
  const overage = await isOverage(client.id, tier, "sms");

  const target = client.notifications?.notificationPhone || client.phone;
  if (!target) {
    console.log(`[notify] No phone for SMS — client ${client.id}`);
    return false;
  }

  if (!channelReady("sms")) {
    console.log(`[notify] SMS not configured — would send to ${target}: ${buildSmsText(lead)}`);
    await incrementUsage(client.id, "sms", overage);
    return true;
  }

  try {
    const auth = Buffer.from(`${MM_KEY}:${MM_SECRET}`).toString("base64");
    const res = await fetch("https://api.messagemedia.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{
          content: buildSmsText(lead),
          destination_number: target,
          format: "SMS",
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[notify] SMS API error ${res.status}:`, err);
      return false;
    }

    await incrementUsage(client.id, "sms", overage);
    console.log(`[notify] SMS sent to ${target} for lead ${lead.id}${overage ? " (overage)" : ""}`);
    return true;
  } catch (e) {
    console.error("[notify] SMS failed:", e);
    return false;
  }
}

function buildSmsText(lead: LeadCapture): string {
  const emoji = lead.urgency === "emergency" ? "🚨" : lead.urgency === "soon" ? "⏰" : "💰";
  let text = `${emoji} ${lead.name} — ${lead.service}`;
  if (lead.address) text += ` at ${lead.address}`;
  text += `. Call ${lead.phone}`;
  if (lead.message) text += `. Notes: ${lead.message}`;
  return text;
}

// ── WhatsApp via MessageMedia Conversation API ──────────────────────────────

async function sendWhatsApp(client: LeadGenClient, lead: LeadCapture): Promise<boolean> {
  const tier = client.subscription?.tier ?? "starter";
  const overage = await isOverage(client.id, tier, "whatsapp");

  const target = client.notifications?.notificationPhone || client.phone;
  if (!target) {
    console.log(`[notify] No phone for WhatsApp — client ${client.id}`);
    return false;
  }

  if (!channelReady("whatsapp")) {
    console.log(`[notify] WhatsApp not configured — would send to ${target}: ${buildWaText(lead)}`);
    await incrementUsage(client.id, "whatsapp", overage);
    return true;
  }

  try {
    const auth = Buffer.from(`${MM_KEY}:${MM_SECRET}`).toString("base64");
    const res = await fetch("https://api.messagemedia.com/v1/whatsapp/messages", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{
          content: buildWaText(lead),
          destination_number: target,
          format: "WHATSAPP",
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[notify] WhatsApp API error ${res.status}:`, err);
      return false;
    }

    await incrementUsage(client.id, "whatsapp", overage);
    console.log(`[notify] WhatsApp sent to ${target} for lead ${lead.id}${overage ? " (overage)" : ""}`);
    return true;
  } catch (e) {
    console.error("[notify] WhatsApp failed:", e);
    return false;
  }
}

function buildWaText(lead: LeadCapture): string {
  let text = `*${lead.urgency === "emergency" ? "🚨 EMERGENCY" : lead.urgency === "soon" ? "⏰ SOON" : "💰 QUOTE"}*`;
  text += `\n\n*Name:* ${lead.name}`;
  text += `\n*Phone:* ${lead.phone}`;
  if (lead.email) text += `\n*Email:* ${lead.email}`;
  text += `\n*Service:* ${lead.service}`;
  if (lead.address) text += `\n*Address:* ${lead.address}`;
  if (lead.message) text += `\n*Notes:* ${lead.message}`;
  return text;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface NotificationResult {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  usage: UsageData;
}

/**
 * Send notifications across all enabled channels for a captured lead.
 * Supports per-client channel preferences. Never blocks — overage is tracked.
 */
export async function sendLeadNotification(
  client: LeadGenClient,
  lead: LeadCapture
): Promise<NotificationResult> {
  const prefs = client.notifications ?? { email: true, sms: true, whatsapp: true };

  const [emailResult, smsResult, waResult] = await Promise.all([
    prefs.email    ? sendEmail(client, lead)    : Promise.resolve(false),
    prefs.sms      ? sendSms(client, lead)      : Promise.resolve(false),
    prefs.whatsapp ? sendWhatsApp(client, lead) : Promise.resolve(false),
  ]);

  const usage = await getUsage(client.id);

  return {
    email: emailResult,
    sms: smsResult,
    whatsapp: waResult,
    usage,
  };
}

export interface NotificationUsageSummary {
  email: "unlimited";
  sms: {
    used: number;
    limit: number;
    overage: number;
    topup: number;
    effectiveLimit: number;
  };
  whatsapp: {
    used: number;
    limit: number;
    overage: number;
    topup: number;
    effectiveLimit: number;
  };
  overage: {
    blockSize: number;
    pricePerBlock: number;
    blockLabel: string;
  };
}

/**
 * Get notification usage summary for a client (for portal display).
 * Includes overage tracking and top-up info.
 */
export async function getNotificationUsage(client: LeadGenClient): Promise<NotificationUsageSummary> {
  const usage = await getUsage(client.id);
  const limits = TIER_LIMITS[client.subscription?.tier ?? "starter"];

  const smsLimit = limits.sms as number;
  const waLimit = limits.whatsapp as number;

  return {
    email: "unlimited",
    sms: {
      used: usage.sms + usage.smsOverage,
      limit: smsLimit,
      overage: usage.smsOverage,
      topup: usage.smsTopup,
      effectiveLimit: smsLimit + usage.smsTopup,
    },
    whatsapp: {
      used: usage.whatsapp + usage.whatsappOverage,
      limit: waLimit,
      overage: usage.whatsappOverage,
      topup: usage.whatsappTopup,
      effectiveLimit: waLimit + usage.whatsappTopup,
    },
    overage: {
      blockSize: OVERAGE.blockSize,
      pricePerBlock: OVERAGE.pricePerBlock,
      blockLabel: OVERAGE.blockLabel,
    },
  };
}

/**
 * Apply a top-up purchase to a client's account.
 * Called by the Stripe webhook when a top-up is purchased.
 * Returns the updated usage data.
 */
export async function applyTopup(
  clientId: string,
  channel: "sms" | "whatsapp",
  blocks: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not available");
  const key = getUsageKey(clientId);
  const messages = blocks * OVERAGE.blockSize;
  try {
    await redis.hincrby(key, `${channel}Topup`, messages);
    await redis.expire(key, 60 * 24 * 60 * 60);
    console.log(`[notify] Topup applied: ${clientId} +${messages} ${channel} (${blocks} blocks)`);
  } catch (e) {
    console.error("[notify] Topup failed:", e);
    throw new Error("Failed to apply top-up");
  }
}
