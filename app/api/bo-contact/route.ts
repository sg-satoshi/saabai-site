import { Resend } from "resend";

export const runtime = "edge";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      company?: string;
      message?: string;
      formType?: string;
    };

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const company = (body.company || "").trim();
    const message = (body.message || "").trim();
    const isEmployer = body.formType !== "candidate";

    if (!name || !email || !message) {
      return Response.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[bo-contact]", { name, email, company, message, isEmployer });
      return Response.json({ ok: true, transport: "log" });
    }

    const resend = new Resend(apiKey);
    const ts = new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Brisbane",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const subject = isEmployer
      ? `New Hiring Enquiry — ${name}${company ? ` (${company})` : ""}`
      : `New Job Seeker Enquiry — ${name}`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F5F6;margin:0;padding:32px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(18,59,93,0.1)">
  <div style="background:#123B5D;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0">${isEmployer ? "New Hiring Enquiry" : "New Job Seeker Enquiry"}</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:4px 0 0">Received ${ts} AEST via boconsulting.com.au</p>
  </div>
  <div style="padding:32px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#5C6670;font-size:13px;width:120px;vertical-align:top">Name</td><td style="padding:8px 0;color:#1A2B3C;font-size:14px;font-weight:600">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#5C6670;font-size:13px;vertical-align:top">Email</td><td style="padding:8px 0;color:#1A2B3C;font-size:14px;font-weight:600"><a href="mailto:${escapeHtml(email)}" style="color:#F58220">${escapeHtml(email)}</a></td></tr>
      ${company ? `<tr><td style="padding:8px 0;color:#5C6670;font-size:13px;vertical-align:top">Company</td><td style="padding:8px 0;color:#1A2B3C;font-size:14px;font-weight:600">${escapeHtml(company)}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#5C6670;font-size:13px;vertical-align:top">Enquiry Type</td><td style="padding:8px 0;color:#1A2B3C;font-size:14px;font-weight:600">${isEmployer ? "Employer — Hiring" : "Candidate — Looking for Work"}</td></tr>
    </table>
    <div style="margin-top:24px;background:#F4F5F6;border-radius:8px;padding:20px">
      <p style="color:#5C6670;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px">${isEmployer ? "Roles looking to fill" : "Type of work sought"}</p>
      <p style="color:#1A2B3C;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #E2E6EA;text-align:center">
      <a href="mailto:${escapeHtml(email)}" style="background:#F58220;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;display:inline-block">Reply to ${escapeHtml(name.split(/\s+/)[0])}</a>
    </div>
  </div>
</div>
</body>
</html>`;

    await resend.emails.send({
      from: "BO Consulting Website <noreply@saabai.ai>",
      to: ["info@boconsulting.com.au"],
      replyTo: email,
      subject,
      html,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[bo-contact]", err);
    return Response.json({ ok: false, error: "Failed to send" }, { status: 500 });
  }
}
