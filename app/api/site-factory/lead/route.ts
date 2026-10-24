import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { getSiteBySlug } from "../../../../lib/site-registry";
import { listSiteLeads } from "../../../../lib/site-leads";
import { verifySessionToken, isAdminSession, COOKIE_NAME } from "../../../../lib/auth";
import { isValidEmail } from "../../../../lib/leads-guard";

const redis = Redis.fromEnv();
// Created lazily: constructing Resend at module load throws when
// RESEND_API_KEY is absent (e.g. Preview builds), failing the whole build.
const getResend = () => new Resend(process.env.RESEND_API_KEY);

// Hardcoded lead email overrides, for sites not in the Redis registry
const LEAD_EMAIL_OVERRIDES: Record<string, string> = {
  "bo-consultancy": "info@boconsulting.com.au",
  "wholesale-homes": "hello@wholesalehomes.com.au",
};

// Telegram config per site. Add new sites here.
// Read at send time so a cold start cannot freeze empty env values.
function telegramTarget(siteSlug: string): { token: string; chatId: string } | undefined {
  const sites: Record<string, { token: string; chatId: string }> = {
    "nico-moretti": {
      token: process.env.TG_NICO_BOT || "",
      chatId: process.env.TELEGRAM_CHAT_ID_NICO_MORETTI || "",
    },
    "heaven-thai-massage": {
      token: process.env.TG_HTM_BOT || "",
      chatId: process.env.TELEGRAM_CHAT_ID_HEAVEN_THAI_MASSAGE || "",
    },
    "wholesale-homes": {
      token: process.env.TG_WHOLESALE_HOMES_BOT || "",
      chatId: process.env.TELEGRAM_CHAT_ID_WHOLESALE_HOMES || "",
    },
  };
  return sites[siteSlug];
}

// Em dash and en dash (plus the neighbouring unicode dashes) never go out in copy.
function clean(value: string): string {
  return value.replace(/[\u2012-\u2015]/g, "-");
}

function siteDisplayName(site: { name?: string } | null, siteSlug: string): string {
  const name = site?.name?.trim() || "";
  return name || siteSlug;
}

function leadSubject(submitterName: string, displayName: string): string {
  const who = clean(submitterName.trim() || "Anonymous");
  const where = clean(displayName.trim() || "site");
  return `New booking enquiry: ${who} (${where})`;
}

function submitterReplyTo(email: string): string[] | undefined {
  const trimmed = email.trim();
  return isValidEmail(trimmed) ? [trimmed] : undefined;
}

function resendErrorMessage(message: string): string {
  const raw = message.trim() || "Resend returned an error";
  const key = process.env.RESEND_API_KEY;
  if (key && raw.includes(key)) return raw.split(key).join("[redacted]");
  return raw;
}

function corsOrigin(origin: string | null): string {
  const allowed = [
    "https://nicomoretti.au",
    "https://www.wholesalehomes.com.au",
    "https://wholesalehomes.com.au",
  ];
  if (origin && allowed.includes(origin)) return origin;
  return "https://nicomoretti.au";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function corsJson(data: unknown, status = 200, origin?: string | null): Response {
  const o = origin === undefined ? null : origin;
  return Response.json(data, { status, headers: { ...CORS_HEADERS, "Access-Control-Allow-Origin": corsOrigin(o) } });
}

// Node runtime: the admin check on GET verifies the Saabai session with
// WebCrypto, which the edge sandbox rejected (cross-realm ArrayBuffer) in
// local testing. Lead capture (POST) behaves the same on Node.
export const runtime = "nodejs";

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
            <span style="font-size:13px;color:#6b5a10;margin-left:10px;">via ${clean(lead.siteSlug)}</span>
          </td>
        </tr>

        <!-- Fields -->
        <tr><td style="padding:8px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${row("Name", clean(lead.name))}
            ${row("Email", clean(lead.email))}
            ${row("Phone", clean(lead.phone))}
            ${row("Duration", clean(lead.metadata?.duration ?? ""))}
            ${row("Event type", clean(lead.metadata?.eventType ?? ""))}
            ${row("Message", lead.message ? clean(lead.message).replace(/\n/g, "<br>") : "")}
            ${row("Received", clean(ts))}
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

function buildLeadEmailText(lead: {
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
  const lines = [`New Inquiry via ${clean(lead.siteSlug)}`, ""];
  const add = (label: string, value: string) => {
    const v = clean(value);
    if (v) lines.push(`${label}: ${v}`);
  };
  add("Name", lead.name);
  add("Email", lead.email);
  add("Phone", lead.phone);
  add("Duration", lead.metadata?.duration ?? "");
  add("Event type", lead.metadata?.eventType ?? "");
  add("Message", lead.message);
  add("Received", ts);
  lines.push("", "Saabai Site Factory · noreply@saabai.ai");
  return clean(lines.join("\n"));
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS, "Access-Control-Allow-Origin": corsOrigin(req.headers.get("origin")) } });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  try {
    const { name, email, phone, message, siteSlug, duration, eventType, state, budget, buyer_type, timeline } =
      await req.json();

    if (!siteSlug) {
      return corsJson({ error: "siteSlug is required" }, 400, origin);
    }

    const lead = {
      name: name || "",
      email: email || "",
      phone: phone || "",
      message: message || "",
      state: state || "",
      budget: budget || "",
      buyer_type: buyer_type || "",
      timeline: timeline || "",
      siteSlug,
      metadata: {
        ...(duration ? { duration } : {}),
        ...(eventType ? { eventType } : {}),
        ...(state ? { state } : {}),
        ...(budget ? { budget } : {}),
        ...(buyer_type ? { buyer_type } : {}),
        ...(timeline ? { timeline } : {}),
      },
      createdAt: Date.now(),
    };

    await redis.lpush(`saabai:leads:${siteSlug}`, JSON.stringify(lead));

    // Send notifications, awaited inline (Edge kills an un-awaited task on exit)
    try {
      const slugKey = siteSlug.toUpperCase().replace(/-/g, "_");
      const site = await getSiteBySlug(siteSlug);
      const toEmail =
        LEAD_EMAIL_OVERRIDES[siteSlug] ??
        process.env[`LEAD_NOTIFY_EMAIL_${slugKey}`] ??
        site?.business?.email ??
        process.env.LEAD_NOTIFY_EMAIL ??
        "shanegoldberg@pm.me";

      const replyTo = submitterReplyTo(typeof email === "string" ? email : "");
      try {
        const { error } = await getResend().emails.send({
          from: "noreply@saabai.ai",
          to: toEmail,
          subject: leadSubject(typeof name === "string" ? name : "", siteDisplayName(site, siteSlug)),
          html: clean(buildLeadEmail(lead)),
          text: buildLeadEmailText(lead),
          ...(replyTo ? { replyTo } : {}),
        });
        if (error) {
          console.error(`Lead notification email failed for ${siteSlug}: ${resendErrorMessage(error.message)}`);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Resend returned an error";
        console.error(`Lead notification email failed for ${siteSlug}: ${resendErrorMessage(message)}`);
      }

      // Per-site Telegram alerts
      const tgConfig = telegramTarget(siteSlug);
      if (tgConfig && tgConfig.token && tgConfig.chatId) {
        const ts = new Date(lead.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", dateStyle: "medium", timeStyle: "short" });
        let msg = `🔔 *New inquiry - ${clean(siteSlug)}*\n\n`;
        msg += `*Name:* ${clean(name || "-")}\n*Email:* ${clean(email || "-")}\n*Phone:* ${clean(phone || "-")}\n`;
        if (buyer_type) msg += `*Type:* ${clean(buyer_type)}\n`;
        if (timeline) msg += `*Timeline:* ${clean(timeline)}\n`;
        if (state) msg += `*State:* ${clean(state)}\n`;
        if (budget) msg += `*Budget:* ${clean(budget)}\n`;
        if (duration) msg += `*Duration:* ${clean(duration)}\n`;
        if (eventType) msg += `*Event:* ${clean(eventType)}\n`;
        if (message) msg += `*Notes:* ${clean(message)}\n`;
        msg += `\n_Received ${ts}_`;
        msg = clean(msg);
        const tgRes = await fetch(`https://api.telegram.org/bot${tgConfig.token}/sendMessage?chat_id=${tgConfig.chatId}&text=${encodeURIComponent(msg)}&parse_mode=Markdown`);
        if (!tgRes.ok) console.error("Telegram error:", await tgRes.text());
      }
    } catch (e) {
      console.error("Lead notification failed:", e);
    }

    return corsJson({ success: true, message: "Lead captured" }, 200, origin);
  } catch (error) {
    console.error("Lead capture error:", error);
    return corsJson(
      { error: "Failed to capture lead" },
      500,
      origin
    );
  }
}

export async function GET(req: Request) {
  // Lead lists are personal information: Saabai admins only. (The route is
  // public in proxy.ts so sites can POST leads, so the check lives here.)
  // The Wholesale admin reads its own leads via /api/wholesale-admin/leads.
  if (!(await isSaabaiAdmin(req))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const siteSlug = url.searchParams.get("siteSlug");

    if (!siteSlug || !/^[a-z0-9-]{1,80}$/.test(siteSlug)) {
      return Response.json({ error: "siteSlug is required" }, { status: 400 });
    }

    const leads = await listSiteLeads(siteSlug);
    return Response.json({ success: true, leads });
  } catch (error) {
    console.error("Lead fetch error:", error);
    return Response.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

async function isSaabaiAdmin(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") ?? "";
  const m = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`).exec(cookie);
  if (!m) return false;
  const session = await verifySessionToken(decodeURIComponent(m[1]));
  return !!session && (await isAdminSession(session.clientId));
}
