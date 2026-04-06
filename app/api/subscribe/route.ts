import { NextRequest, NextResponse } from "next/server";
import { saveSubscriber } from "../../../lib/subscribers";

export const runtime = "nodejs";

const WELCOME_EMAIL_HTML = (firstName: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#0e0c2e;padding:32px 40px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Saabai<span style="color:#00bfa5;">.</span>ai</p>
    <p style="margin:8px 0 0;font-size:13px;color:#8b8fa8;letter-spacing:0.5px;">AI AUTOMATION FOR PROFESSIONAL FIRMS</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px 40px 32px;">
    <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Hi ${firstName},</p>
    <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#0e0c2e;line-height:1.25;">Your AI Readiness Audit</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">Answer these 12 questions honestly. Each "No" or "Not sure" is an automation opportunity. Add them up at the end.</p>

    <!-- Section 1 -->
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#00bfa5;text-transform:uppercase;">Section 1 — Intake & Enquiry</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;margin-bottom:8px;display:block;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">1. Does every new enquiry get a response within 15 minutes, 24/7?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">If after-hours enquiries wait until morning, you're losing leads you never know about.</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">2. Can a new enquiry be onboarded without any manual data entry?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">If someone on your team copies a name into a CRM by hand, that's automatable.</p>
      </td></tr>
    </table>
    <div style="height:8px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">3. Do you know your after-hours enquiry rate?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Most firms don't. Across 12+ audits, 30–45% of enquiries arrive outside business hours.</p>
      </td></tr>
    </table>

    <!-- Section 2 -->
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#00bfa5;text-transform:uppercase;">Section 2 — Admin & Document Flow</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">4. Does your team spend less than 2 hours/week chasing documents from clients?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Document chasing is the most automatable task in professional services.</p>
      </td></tr>
    </table>
    <div style="height:8px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">5. Is your CRM updated automatically when work progresses on a matter?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Manual CRM updates are a symptom of disconnected systems.</p>
      </td></tr>
    </table>
    <div style="height:8px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">6. Are standard documents (contracts, letters, reports) generated automatically from your data?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">If someone opens a Word template and fills it in manually, that's a 15-minute task that shouldn't exist.</p>
      </td></tr>
    </table>

    <!-- Section 3 -->
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#00bfa5;text-transform:uppercase;">Section 3 — Team & Capacity</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">7. Do your qualified staff spend less than 20% of their time on admin tasks?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Fee earners doing admin is the most expensive inefficiency in the business.</p>
      </td></tr>
    </table>
    <div style="height:8px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">8. Can your team take on 30% more work without additional hires?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">If capacity is the ceiling, automation is usually the fastest way to raise it.</p>
      </td></tr>
    </table>
    <div style="height:8px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">9. If a key team member was away for two weeks, would your processes still run smoothly?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Knowledge in people's heads — not systems — is a fragility, not just an inconvenience.</p>
      </td></tr>
    </table>

    <!-- Section 4 -->
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#00bfa5;text-transform:uppercase;">Section 4 — Systems & Data</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">10. Do you have one source of truth for client data — not email + CRM + spreadsheet?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">The spreadsheet-CRM-email triangle is the most common data problem in professional services.</p>
      </td></tr>
    </table>
    <div style="height:8px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">11. Does your team have a defined process for every common client request — documented, not just known?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Undocumented processes can't be automated. They can barely be delegated.</p>
      </td></tr>
    </table>
    <div style="height:8px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">12. Do you have a way to measure whether a process is working — response times, conversion rates, turnaround?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">You can't improve what you don't measure. Automation without metrics is just hope.</p>
      </td></tr>
    </table>

    <!-- Score guide -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;background:#0e0c2e;border-radius:12px;">
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#00bfa5;letter-spacing:0.8px;text-transform:uppercase;">What your score means</p>
        <p style="margin:0 0 10px;font-size:13px;color:#e5e7eb;"><strong style="color:#fff;">10–12 Yes:</strong> Your systems are solid. You're ready for more sophisticated AI — agents, predictive tools, client-facing automation.</p>
        <p style="margin:0 0 10px;font-size:13px;color:#e5e7eb;"><strong style="color:#fff;">6–9 Yes:</strong> Real opportunity. 2–3 high-impact automations would meaningfully recover capacity. Good place to start.</p>
        <p style="margin:0 0 10px;font-size:13px;color:#e5e7eb;"><strong style="color:#fff;">3–5 Yes:</strong> Significant friction in your current setup. The audit would quickly surface where the biggest gains are.</p>
        <p style="margin:0;font-size:13px;color:#e5e7eb;"><strong style="color:#fff;">0–2 Yes:</strong> High opportunity, some foundational work first. Start with one process — pick the most painful one.</p>
      </td></tr>
    </table>

    <!-- CTA -->
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">If you want to walk through your specific results — I'm happy to do a 30-minute audit call. No obligation, no pitch. Just a clear picture of where your biggest gains are.</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="background:#00bfa5;border-radius:10px;padding:14px 28px;">
        <a href="https://calendly.com/shanegoldberg/30min" style="color:#0e0c2e;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:0.3px;">Book a Free 30-Minute Audit Call →</a>
      </td></tr>
    </table>

    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">Talk soon,<br><strong>Shane Goldberg</strong><br><span style="color:#6b7280;font-size:13px;">Saabai.ai — AI Automation for Professional Firms</span></p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 40px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you requested the AI Readiness Audit from saabai.ai<br>
    <a href="https://saabai.ai" style="color:#00bfa5;text-decoration:none;">saabai.ai</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

async function getGeo(ip: string): Promise<{ country?: string; countryCode?: string; city?: string; region?: string }> {
  // Skip private/loopback IPs
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) return {};
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return {};
    const d = await res.json();
    return {
      country:     d.country_name ?? undefined,
      countryCode: d.country_code ?? undefined,
      city:        d.city ?? undefined,
      region:      d.region ?? undefined,
    };
  } catch (err) {
    console.warn("[subscribe] geo lookup failed for", ip, err);
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, firstName, industry, source } = body as {
      email?: string;
      firstName?: string;
      industry?: string;
      source?: string;
    };

    // 1. Validate required fields
    if (!email || !firstName) {
      return NextResponse.json(
        { ok: false, error: "email and firstName are required" },
        { status: 400 }
      );
    }

    // Extract real IP from Vercel headers
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
      || req.headers.get("x-real-ip")
      || "";

    // Geo lookup (non-blocking — fires async, falls back gracefully)
    const geo = await getGeo(ip);

    // 3. Normalise email
    const normalisedEmail = email.trim().toLowerCase();

    // 2 & 4. Save to Redis (handles duplicate check internally)
    const { isNew } = await saveSubscriber({
      email: normalisedEmail,
      firstName: firstName.trim(),
      industry: industry?.trim() || "Other",
      source: source?.trim() || "website",
      ip: ip || undefined,
      ...geo,
    });

    // Silent duplicate — return ok without sending emails
    if (!isNew) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // 8. Send welcome email via Resend
    const resendKey = (process.env.RESEND_API_KEY ?? "").replace(/[\s\n]/g, "");

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Shane at Saabai <hello@saabai.ai>",
          to: normalisedEmail,
          subject: "Your AI Readiness Audit — here's the checklist",
          html: WELCOME_EMAIL_HTML(firstName.trim()),
        }),
      });

      // 9. Notify Shane
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Shane at Saabai <hello@saabai.ai>",
          to: "hello@saabai.ai",
          subject: `New subscriber: ${firstName.trim()} (${normalisedEmail})`,
          html: `<p><strong>New subscriber</strong></p>
<ul>
  <li><strong>Name:</strong> ${firstName.trim()}</li>
  <li><strong>Email:</strong> ${normalisedEmail}</li>
  <li><strong>Industry:</strong> ${industry?.trim() || "Other"}</li>
  <li><strong>Source:</strong> ${source?.trim() || "website"}</li>
  <li><strong>IP:</strong> ${ip || "unknown"}</li>
  <li><strong>Location:</strong> ${[geo.city, geo.region, geo.country].filter(Boolean).join(", ") || "unknown"}</li>
</ul>`,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscribe] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
