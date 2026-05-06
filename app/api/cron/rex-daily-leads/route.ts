import { Resend } from "resend";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRIORITY_THRESHOLD = 200;
const DASHBOARD_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai-site.vercel.app";
const TO_EMAIL = "hello@saabai.ai";

interface LeadEvent {
  timestamp: string;
  source?: string;
  name?: string;
  email?: string;
  price?: string;
  priceValue?: number;
  material?: string;
  summary?: string;
}

function brisbaneLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Brisbane",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function todayBrisbane(): string {
  return new Date().toLocaleDateString("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildEmail(leads: LeadEvent[]): { subject: string; html: string } {
  const dateLabel = todayBrisbane();
  const subject = leads.length > 0
    ? `Rex Priority Leads — ${leads.length} new today (${dateLabel})`
    : `Rex Priority Leads — None today (${dateLabel})`;

  const leadRows = leads.length === 0
    ? `<tr><td colspan="5" style="padding:24px;text-align:center;color:#888;font-size:14px;">No priority leads captured in the last 24 hours.</td></tr>`
    : leads.map((l, i) => {
        const name = l.name ?? "Unknown";
        const email = l.email ?? "No email";
        const price = l.price ?? "—";
        const material = l.material ?? "—";
        const time = brisbaneLabel(l.timestamp);
        const summary = l.summary ?? "";
        const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";

        return `
          <tr style="background:${bg};">
            <td style="padding:14px 16px;font-size:13px;font-weight:600;color:#111;">${name}</td>
            <td style="padding:14px 16px;font-size:13px;color:#444;">${email}</td>
            <td style="padding:14px 16px;font-size:13px;font-weight:700;color:#e13f00;">${price}</td>
            <td style="padding:14px 16px;font-size:13px;color:#444;">${material}</td>
            <td style="padding:14px 16px;font-size:12px;color:#666;">${time}</td>
          </tr>
          ${summary ? `<tr style="background:${bg};"><td colspan="5" style="padding:0 16px 14px;font-size:12px;color:#666;font-style:italic;border-bottom:1px solid #e5e7eb;">${summary}</td></tr>` : `<tr style="background:${bg};"><td colspan="5" style="border-bottom:1px solid #e5e7eb;padding:0;"></td></tr>`}
        `;
      }).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;">
      <div style="max-width:680px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:#111827;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Plastic<span style="color:#e13f00;">Online</span></p>
            <p style="margin:5px 0 0;font-size:11px;color:#888;letter-spacing:1.5px;text-transform:uppercase;">Rex Priority Leads</p>
          </div>
          <div style="text-align:right;">
            <span style="background:#fef2f2;color:#dc2626;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">Priority</span>
            <p style="margin:6px 0 0;font-size:11px;color:#888;">${dateLabel}</p>
          </div>
        </div>

        <!-- Summary bar -->
        <div style="background:#fafafa;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;gap:32px;">
          <div>
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Priority Leads</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#111;">${leads.length}</p>
          </div>
          <div>
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Quoted Value</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#e13f00;">$${leads.reduce((s, l) => s + (l.priceValue ?? 0), 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Threshold</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#111;">$${PRIORITY_THRESHOLD}+</p>
          </div>
        </div>

        <!-- Table -->
        <div style="padding:0;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                <th style="padding:10px 16px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Name</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Email</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Quote</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Material</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Time</th>
              </tr>
            </thead>
            <tbody>
              ${leadRows}
            </tbody>
          </table>
        </div>

        <!-- CTA -->
        <div style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <a href="${DASHBOARD_URL}/rex-dashboard"
             style="display:inline-block;background:#e13f00;color:#ffffff;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
            View All Leads in Dashboard →
          </a>
          <p style="margin:12px 0 0;font-size:11px;color:#aaa;">Click Leads tab once in the dashboard to see full details.</p>
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#aaa;">Daily digest from Rex at PlasticOnline. Sent at 8:00am AEST.</p>
        </div>

      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const resend = new Resend(process.env.PLON_RESEND_API_KEY ?? process.env.RESEND_API_KEY);
  const fromEmail = process.env.PLON_FROM_EMAIL ?? "Rex at PlasticOnline <onboarding@resend.dev>";

  // Fetch last 100 leads from Redis
  const raw = await redis.lrange<string>("rex:list:recent", 0, 99);
  const allLeads: LeadEvent[] = (raw ?? [])
    .map(r => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } })
    .filter(Boolean) as LeadEvent[];

  // Filter to last 24 hours and priority threshold
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const priorityLeads = allLeads.filter(l =>
    l.timestamp >= cutoff && (l.priceValue ?? 0) >= PRIORITY_THRESHOLD
  );

  // Sort newest first
  priorityLeads.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const { subject, html } = buildEmail(priorityLeads);

  const result = await resend.emails.send({
    from: fromEmail,
    to: TO_EMAIL,
    subject,
    html,
  });

  return Response.json({
    ok: true,
    sent: priorityLeads.length,
    emailId: result.data?.id ?? null,
  });
}
