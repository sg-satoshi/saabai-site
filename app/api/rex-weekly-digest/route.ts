/**
 * Rex Weekly Performance Digest
 *
 * Cron: every Monday 9am AEST (Sunday 23:00 UTC)
 * Configured in vercel.json → crons
 *
 * Sends two emails:
 *   1. Client email → PLON team  (beautiful business intelligence report)
 *   2. Operator email → Shane / Saabai (cross-client summary)
 *
 * Can be triggered manually with:
 *   GET /api/rex-weekly-digest  (with x-cron-secret header)
 */

import { type NextRequest } from "next/server";
import { Resend } from "resend";
import { fetchWeeklyDigestData } from "../../../lib/rex-stats";
import { fetchRecentOrders } from "../../../lib/woo-client";
import { createHash } from "crypto";

export const runtime = "nodejs";

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = req.headers.get("x-cron-secret");
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function pct(a: number, b: number): string {
  if (!b) return "—";
  const delta = Math.round(((a - b) / b) * 100);
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return "0%";
}

function arrow(a: number, b: number): { symbol: string; color: string } {
  if (!b || a === b) return { symbol: "→", color: "#888888" };
  return a > b
    ? { symbol: "↑", color: "#25D366" }
    : { symbol: "↓", color: "#e13f00" };
}

function fmtAUD(n: number): string {
  return n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toFixed(0)}`;
}

function weekRange(): string {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// ── Mini bar chart (email-safe HTML table) ────────────────────────────────────

function renderBarChart(byDay: Array<{ label: string; count: number }>): string {
  const max = Math.max(...byDay.map(d => d.count), 1);
  const MAX_HEIGHT = 40;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${byDay.map(d => {
          const h = Math.max(Math.round((d.count / max) * MAX_HEIGHT), d.count > 0 ? 3 : 0);
          const isEmpty = d.count === 0;
          return `
          <td style="vertical-align:bottom;text-align:center;padding:0 3px;">
            <div style="background:${isEmpty ? "#333333" : "#e13f00"};height:${h}px;border-radius:2px 2px 0 0;min-height:${isEmpty ? "2" : "3"}px;"></div>
            <p style="margin:5px 0 0;font-size:10px;color:#666666;line-height:1;">${d.label}</p>
            <p style="margin:2px 0 0;font-size:10px;color:${isEmpty ? "#555" : "#cccccc"};font-weight:${d.count > 0 ? "700" : "400"};">${d.count}</p>
          </td>`;
        }).join("")}
      </tr>
    </table>`;
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function statCell(label: string, value: string, subtext: string, color = "#ffffff"): string {
  return `
    <td style="text-align:center;padding:20px 12px;border-right:1px solid #2a2a2a;">
      <p style="margin:0;font-size:28px;font-weight:900;color:${color};letter-spacing:-1px;line-height:1;">${value}</p>
      <p style="margin:6px 0 2px;font-size:11px;font-weight:700;color:#aaaaaa;text-transform:uppercase;letter-spacing:1px;">${label}</p>
      <p style="margin:0;font-size:11px;color:#555555;">${subtext}</p>
    </td>`;
}

// ── Client email (PLON team) ──────────────────────────────────────────────────

interface DigestEmailData {
  thisWeek: {
    leads: number;
    withEmail: number;
    withPrice: number;
    quotedRevenue: number;
    avgQuote: number;
    emailCaptureRate: number;
    topMaterials: Array<{ name: string; count: number }>;
    byDay: Array<{ date: string; label: string; count: number }>;
  };
  lastWeek: { leads: number; withEmail: number; withPrice: number; quotedRevenue: number };
  attribution: { orders: number; revenue: number } | null;
  range: string;
}

function buildClientEmail(d: DigestEmailData): string {
  const leadsArrow = arrow(d.thisWeek.leads, d.lastWeek.leads);
  const revenueArrow = arrow(d.thisWeek.quotedRevenue, d.lastWeek.quotedRevenue);
  const estimatedHours = Math.round(d.thisWeek.withEmail * 0.2 * 10) / 10;

  const materialsHtml = d.thisWeek.topMaterials.length > 0
    ? d.thisWeek.topMaterials.map((m, i) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;">
            <span style="font-size:13px;color:#aaaaaa;">${i + 1}.</span>
            <span style="font-size:14px;color:#ffffff;font-weight:700;margin-left:10px;">${m.name}</span>
          </td>
          <td style="text-align:right;padding:10px 0;border-bottom:1px solid #1e1e1e;">
            <span style="font-size:14px;color:#e13f00;font-weight:700;">${m.count} enquir${m.count === 1 ? "y" : "ies"}</span>
          </td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="padding:12px 0;color:#555555;font-size:13px;">No material data this week</td></tr>`;

  const attributionHtml = d.attribution && d.attribution.orders > 0
    ? `
    <!-- Attribution strip -->
    <tr><td style="background:#1a1a1a;padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:0;">
        <tr>
          <td style="padding:20px 24px;border-right:1px solid #2a2a2a;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#25D366;">${d.attribution.orders}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#666666;text-transform:uppercase;letter-spacing:1px;">Rex-Attributed Orders</p>
          </td>
          <td style="padding:20px 24px;border-right:1px solid #2a2a2a;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#25D366;">${fmtAUD(d.attribution.revenue)}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#666666;text-transform:uppercase;letter-spacing:1px;">Attributed Revenue</p>
          </td>
          <td style="padding:20px 24px;">
            <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.5;">Orders placed this week by customers who chatted with Rex — tracked by email matching.</p>
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="background:#1a1a1a;height:24px;font-size:0;"></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
</head>
<body style="margin:0;padding:0;background:#111111;">

<div style="display:none;max-height:0;overflow:hidden;">Rex handled ${d.thisWeek.leads} enquiries this week — here's your full performance snapshot.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#1a1a1a;padding:28px 40px 0;border-radius:16px 16px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Plastic<span style="color:#e13f00;">Online</span></p>
          <p style="margin:4px 0 0;font-size:11px;color:#666666;letter-spacing:1.5px;text-transform:uppercase;">Rex Weekly Report</p>
        </td>
        <td align="right" valign="top">
          <p style="margin:0;font-size:12px;color:#555555;">${d.range}</p>
        </td>
      </tr>
    </table>
    <!-- Red accent -->
    <div style="background:#e13f00;height:3px;margin:24px -40px 0;font-size:0;"></div>
  </td></tr>

  <!-- Hero stat -->
  <tr><td style="background:#1a1a1a;padding:36px 40px 28px;text-align:center;">
    <p style="margin:0;font-size:60px;font-weight:900;color:#ffffff;letter-spacing:-3px;line-height:1;">
      ${d.thisWeek.leads}
      <span style="font-size:24px;color:${leadsArrow.color};letter-spacing:0;">${leadsArrow.symbol} ${pct(d.thisWeek.leads, d.lastWeek.leads)}</span>
    </p>
    <p style="margin:10px 0 0;font-size:16px;color:#888888;letter-spacing:1px;text-transform:uppercase;">Enquiries handled by Rex this week</p>
    ${estimatedHours > 0 ? `<p style="margin:14px 0 0;font-size:13px;color:#555555;">Saved your team an estimated <strong style="color:#aaaaaa;">${estimatedHours} hrs</strong> in phone time.</p>` : ""}
  </td></tr>

  <!-- 4-stat row -->
  <tr><td style="background:#1a1a1a;padding:0 40px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;">
      <tr>
        ${statCell("Leads with email", `${d.thisWeek.withEmail}`, `${d.thisWeek.emailCaptureRate}% capture rate`)}
        ${statCell("Quoted enquiries", `${d.thisWeek.withPrice}`, `${d.lastWeek.withPrice} last week`)}
        ${statCell("Pipeline value", d.thisWeek.quotedRevenue > 0 ? fmtAUD(d.thisWeek.quotedRevenue) : "—", `${revenueArrow.symbol} ${pct(d.thisWeek.quotedRevenue, d.lastWeek.quotedRevenue)} vs last week`, d.thisWeek.quotedRevenue > 0 ? "#ffffff" : "#555555")}
        <td style="text-align:center;padding:20px 12px;">
          <p style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;line-height:1;">${d.thisWeek.avgQuote > 0 ? fmtAUD(d.thisWeek.avgQuote) : "—"}</p>
          <p style="margin:6px 0 2px;font-size:11px;font-weight:700;color:#aaaaaa;text-transform:uppercase;letter-spacing:1px;">Avg Quote</p>
          <p style="margin:0;font-size:11px;color:#555555;">Ex GST</p>
        </td>
      </tr>
    </table>
  </td></tr>

  ${attributionHtml}

  <!-- Bar chart -->
  <tr><td style="background:#1a1a1a;padding:0 40px 32px;">
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:1px;">Daily Activity</p>
    ${renderBarChart(d.thisWeek.byDay)}
  </td></tr>

  <!-- Top materials -->
  <tr><td style="background:#1a1a1a;padding:0 40px 32px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:1px;">What Rex Was Asked About</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${materialsHtml}
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:#1a1a1a;padding:0 40px 36px;text-align:center;">
    <a href="https://www.saabai.ai/rex-dashboard" style="display:inline-block;background:#e13f00;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">View Full Dashboard →</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#141414;padding:24px 40px;border-radius:0 0 16px 16px;border-top:1px solid #1e1e1e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0;font-size:12px;color:#444444;">
            Powered by <strong style="color:#666666;">Rex</strong> · Built by <a href="https://www.saabai.ai" style="color:#666666;text-decoration:none;">Saabai</a>
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#333333;">This digest is sent every Monday morning. Reply to ask questions about your data.</p>
        </td>
        <td align="right">
          <p style="margin:0;font-size:11px;color:#333333;">PlasticOnline · Gold Coast, QLD</p>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Operator email (Saabai / Shane) ───────────────────────────────────────────

function buildOperatorEmail(d: DigestEmailData, sent: boolean): string {
  const leadsChange = pct(d.thisWeek.leads, d.lastWeek.leads);
  const emailRate = d.thisWeek.emailCaptureRate;
  const revenueChange = pct(d.thisWeek.quotedRevenue, d.lastWeek.quotedRevenue);
  const alert = d.thisWeek.leads === 0 ? "⚠️ ZERO ACTIVITY — check widget embed" : null;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <tr><td style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;border-bottom:2px solid #e13f00;">
    <p style="margin:0;font-size:13px;color:#e13f00;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Saabai Operator Digest</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#ffffff;">Weekly Platform Summary</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555555;">${d.range}</p>
  </td></tr>

  ${alert ? `<tr><td style="background:#2a1a1a;padding:16px 32px;border-left:3px solid #e13f00;">
    <p style="margin:0;font-size:14px;color:#e13f00;font-weight:700;">${alert}</p>
  </td></tr>` : ""}

  <!-- PlasticOnline row -->
  <tr><td style="background:#1a1a1a;padding:24px 32px;">
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#888888;text-transform:uppercase;letter-spacing:1px;">PlasticOnline (PLON)</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:25%;padding:0 8px 0 0;">
          <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">${d.thisWeek.leads}</p>
          <p style="margin:3px 0 0;font-size:11px;color:#555555;">Leads · ${leadsChange} WoW</p>
        </td>
        <td style="width:25%;padding:0 8px;">
          <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">${emailRate}%</p>
          <p style="margin:3px 0 0;font-size:11px;color:#555555;">Email capture</p>
        </td>
        <td style="width:25%;padding:0 8px;">
          <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">${d.thisWeek.quotedRevenue > 0 ? fmtAUD(d.thisWeek.quotedRevenue) : "—"}</p>
          <p style="margin:3px 0 0;font-size:11px;color:#555555;">Pipeline · ${revenueChange} WoW</p>
        </td>
        <td style="width:25%;padding:0 0 0 8px;">
          <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">${d.attribution ? d.attribution.orders : "—"}</p>
          <p style="margin:3px 0 0;font-size:11px;color:#555555;">Attributed orders</p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#444444;">Top materials: ${d.thisWeek.topMaterials.map(m => m.name).join(" · ") || "none"}</p>
  </td></tr>

  <!-- Client email status -->
  <tr><td style="background:#161616;padding:16px 32px;border-top:1px solid #222222;">
    <p style="margin:0;font-size:12px;color:${sent ? "#25D366" : "#e13f00"};">
      ${sent ? "✓ Client email sent to PLON team" : "✗ Client email failed to send — check Resend + env vars"}
    </p>
  </td></tr>

  <!-- Links -->
  <tr><td style="background:#1a1a1a;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #1e1e1e;">
    <p style="margin:0;font-size:12px;color:#444444;">
      <a href="https://www.saabai.ai/saabai-admin" style="color:#e13f00;text-decoration:none;font-weight:700;">Saabai Admin →</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="https://www.saabai.ai/rex-dashboard" style="color:#666666;text-decoration:none;">PLON Dashboard</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Fetch weekly stats + WooCommerce attribution in parallel
    const [weekly, orders] = await Promise.all([
      fetchWeeklyDigestData(),
      fetchRecentOrders(7),
    ]);

    // Revenue attribution: match last 7 days orders against this week's Rex lead email hashes
    const thisWeekLeadHashes = new Set<string>(
      // We don't store hashes in the weekly window — rebuild from leads in recent list
      // The WooCommerce matching is an approximation: any order from a known Rex lead email
    );

    // Simple attribution: check all orders against PLON's lead emails (same logic as dashboard)
    // For the digest we just count matches + sum revenue
    let attributedOrders = 0;
    let attributedRevenue = 0;

    if (orders.length > 0) {
      // We don't have email hashes from the weekly window directly.
      // Fall back to checking if order email is in any recent lead (all-time recent list).
      // This is an approximation — good enough for a weekly digest.
      const recentEmails = new Set<string>(); // placeholder — hashes not available in weekly window
      // Skip precise attribution for the digest (dashboard has the full version)
      // Instead use total orders as context
      attributedOrders = 0; // will be populated when we add hash tracking to weekly window
      attributedRevenue = 0;
    }

    const range = weekRange();
    const attribution = attributedOrders > 0 ? { orders: attributedOrders, revenue: attributedRevenue } : null;

    const emailData: DigestEmailData = {
      thisWeek: weekly.thisWeek,
      lastWeek: weekly.lastWeek,
      attribution,
      range,
    };

    // ── Send client email (PLON team) ──────────────────────────────────────────
    const plonResend = new Resend(process.env.PLON_RESEND_API_KEY ?? process.env.RESEND_API_KEY);
    const fromEmail = process.env.PLON_FROM_EMAIL ?? "Rex at PlasticOnline <onboarding@resend.dev>";
    const teamEmail = process.env.PLON_TEAM_EMAIL ?? "enquiries@plasticonline.com.au";

    let clientEmailSent = false;
    try {
      await plonResend.emails.send({
        from: fromEmail,
        to: teamEmail,
        subject: `Rex Weekly: ${weekly.thisWeek.leads} enquiries · ${range}`,
        html: buildClientEmail(emailData),
      });
      clientEmailSent = true;
    } catch (err) {
      console.error("[rex-weekly-digest] client email failed:", err);
    }

    // ── Send operator email (Saabai / Shane) ───────────────────────────────────
    const saabaiResend = new Resend(process.env.RESEND_API_KEY);
    const saabaiFrom = process.env.SAABAI_FROM_EMAIL ?? "Atlas at Saabai <atlas@saabai.ai>";
    const notifyEmail = process.env.SAABAI_NOTIFY_EMAIL ?? "shane@saabai.ai";

    try {
      await saabaiResend.emails.send({
        from: saabaiFrom,
        to: notifyEmail,
        subject: `[Saabai] Weekly digest — PLON: ${weekly.thisWeek.leads} leads · ${weekly.thisWeek.emailCaptureRate}% capture`,
        html: buildOperatorEmail(emailData, clientEmailSent),
      });
    } catch (err) {
      console.error("[rex-weekly-digest] operator email failed:", err);
    }

    return Response.json({
      ok: true,
      generatedAt: weekly.generatedAt,
      thisWeek: {
        leads: weekly.thisWeek.leads,
        withEmail: weekly.thisWeek.withEmail,
        emailCaptureRate: `${weekly.thisWeek.emailCaptureRate}%`,
        quotedRevenue: weekly.thisWeek.quotedRevenue,
      },
      lastWeek: weekly.lastWeek,
      clientEmailSent,
      range,
    });
  } catch (err) {
    console.error("[rex-weekly-digest] fatal:", err);
    return new Response(String(err), { status: 500 });
  }
}
