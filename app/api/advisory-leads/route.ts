import { Resend } from "resend";

export const runtime = "edge";

const TEAM_EMAIL = "hello@saabai.ai";
const FROM_EMAIL = process.env.ADVISORY_FROM_EMAIL || "Saabai Advisory <hello@saabai.ai>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface AdvisoryEnquiry {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  message?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AdvisoryEnquiry;

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const company = (body.company || "").trim();
    const role = (body.role || "").trim();
    const message = (body.message || "").trim();

    if (!name || !email || !company || !message) {
      return Response.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ ok: false, error: "Invalid email address" }, { status: 400 });
    }

    if (message.length > 5000) {
      return Response.json({ ok: false, error: "Message too long" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[advisory-leads] RESEND_API_KEY not set; logging only");
      console.log("[advisory-leads] Enquiry:", { name, email, company, role, message });
      return Response.json({ ok: true, transport: "log" });
    }

    const resend = new Resend(apiKey);
    const ts = new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Brisbane",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fafafa;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #ebebeb;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#62c5d1;">Advisory Enquiry</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;">New advisory enquiry from ${escapeHtml(name)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#888;width:120px;font-weight:600;vertical-align:top;">Name</td><td style="padding:8px 0;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-weight:600;vertical-align:top;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#62c5d1;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#888;font-weight:600;vertical-align:top;">Company</td><td style="padding:8px 0;">${escapeHtml(company)}</td></tr>
      ${role ? `<tr><td style="padding:8px 0;color:#888;font-weight:600;vertical-align:top;">Role</td><td style="padding:8px 0;">${escapeHtml(role)}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#888;font-weight:600;vertical-align:top;">Submitted</td><td style="padding:8px 0;color:#666;">${ts} AEST</td></tr>
    </table>
    <div style="margin-top:24px;padding:20px;background:#fafafa;border-left:3px solid #62c5d1;border-radius:6px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#62c5d1;">Message</p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#1a1a1a;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#999;">Reply directly to this email to respond to ${escapeHtml(name)}.</p>
  </div>
</body></html>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: TEAM_EMAIL,
      replyTo: email,
      subject: `Advisory Enquiry: ${name}, ${company}`,
      html,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[advisory-leads]", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
