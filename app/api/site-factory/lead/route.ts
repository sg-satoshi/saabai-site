import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { getSiteBySlug } from "../../../../lib/site-registry";

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = "edge";

function buildLeadEmail(lead: {
  name: string;
  email: string;
  phone: string;
  message: string;
  siteSlug: string;
  metadata?: { duration?: string; eventType?: string };
  createdAt: number;
}): string {
  const ts = new Date(lead.createdAt).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const row = (label: string, value: string) =>
    value
      ? `<tr>
          <td style="padding:10px 14px;color:#a0a8b0;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:10px 14px;color:#e0e3e5;font-size:14px;vertical-align:top;">${value}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0d0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#101415;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#f2ca50;padding:20px 28px;">
            <span style="font-size:18px;font-weight:700;color:#101415;letter-spacing:-0.3px;">New Inquiry</span>
            <span style="font-size:13px;color:#6b5a10;margin-left:10px;">via ${lead.siteSlug}</span>
          </td>
        </tr>

        <!-- Fields -->
        <tr><td style="padding:8px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${row("Name", lead.name)}
            ${row("Email", lead.email)}
            ${row("Phone", lead.phone)}
            ${row("Duration", lead.metadata?.duration ?? "")}
            ${row("Event type", lead.metadata?.eventType ?? "")}
            ${row("Message", lead.message ? lead.message.replace(/\n/g, "<br>") : "")}
            ${row("Received", ts)}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #1e2426;">
            <span style="font-size:12px;color:#4a5568;">Saabai Site Factory · noreply@saabai.ai</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendTelegramAlert(lead: {
  name: string;
  email: string;
  phone: string;
  message: string;
  siteSlug: string;
  metadata?: { duration?: string; eventType?: string };
  createdAt: number;
}) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN_NICO_MORETTI || "8697337660:AAG7s4l3U4FZAykt91u8AKDEA11hpKTp1HY";
    const chatId = process.env.TELEGRAM_CHAT_ID_NICO_MORETTI || "5066504835";
    if (!botToken || !chatId) return;

    const ts = new Date(lead.createdAt).toLocaleString("en-AU", {
      timeZone: "Australia/Brisbane",
      dateStyle: "medium",
      timeStyle: "short",
    });

    let text = `🔔 *New inquiry — ${lead.siteSlug}*\n\n`;
    text += `*Name:* ${lead.name || "—"}\n`;
    text += `*Email:* ${lead.email || "—"}\n`;
    text += `*Phone:* ${lead.phone || "—"}\n`;
    if (lead.metadata?.duration) text += `*Duration:* ${lead.metadata.duration}\n`;
    if (lead.metadata?.eventType) text += `*Event:* ${lead.metadata.eventType}\n`;
    if (lead.message) text += `*Notes:* ${lead.message}\n`;
    text += `\n_Received ${ts}_`;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Telegram API error:", res.status, errText);
    }
  } catch (e) {
    console.error("Telegram alert failed:", e);
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, phone, message, siteSlug, duration, eventType } =
      await req.json();

    if (!siteSlug) {
      return Response.json({ error: "siteSlug is required" }, { status: 400 });
    }

    const lead = {
      name: name || "",
      email: email || "",
      phone: phone || "",
      message: message || "",
      siteSlug,
      metadata: {
        ...(duration ? { duration } : {}),
        ...(eventType ? { eventType } : {}),
      },
      createdAt: Date.now(),
    };

    await redis.lpush(`saabai:leads:${siteSlug}`, JSON.stringify(lead));

    // Send notifications (await to ensure they complete before returning)
    try {
      const slugKey = siteSlug.toUpperCase().replace(/-/g, "_");
      const site = await getSiteBySlug(siteSlug);
      const toEmail =
        process.env[`LEAD_NOTIFY_EMAIL_${slugKey}`] ??
        site?.business?.email ??
        process.env.LEAD_NOTIFY_EMAIL ??
        "shanegoldberg@pm.me";

      await resend.emails.send({
        from: "noreply@saabai.ai",
        to: toEmail,
        subject: `New inquiry — ${name || "Anonymous"} via ${siteSlug}`,
        html: buildLeadEmail(lead),
      });

      await sendTelegramAlert(lead);
    } catch (e) {
      console.error("Lead notification failed:", e);
    }

    return Response.json({ success: true, message: "Lead captured" });
  } catch (error) {
    console.error("Lead capture error:", error);
    return Response.json(
      { error: "Failed to capture lead" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const siteSlug = url.searchParams.get("siteSlug");

    if (!siteSlug) {
      return Response.json({ error: "siteSlug is required" }, { status: 400 });
    }

    const leadsRaw = await redis.lrange(`saabai:leads:${siteSlug}`, 0, 99);
    const leads = leadsRaw.map((l: string) => JSON.parse(l));

    return Response.json({ success: true, leads });
  } catch (error) {
    console.error("Lead fetch error:", error);
    return Response.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
