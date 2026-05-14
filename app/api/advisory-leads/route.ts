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
    const firstName = name.split(/\s+/)[0];
    const logoUrl = process.env.ADVISORY_LOGO_URL || "https://www.saabai.ai/brand/saabai-logo-full.png";
    const siteUrl = "https://www.saabai.ai";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>Advisory enquiry from ${escapeHtml(name)}</title>
  <style>
    body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    body{margin:0;padding:0;background:#f5f5f5;}
    a{text-decoration:none;}
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Advisory enquiry from ${escapeHtml(name)} at ${escapeHtml(company)}.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#0b092e;padding:30px 40px;border-radius:14px 14px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <a href="${siteUrl}" style="text-decoration:none;">
            <img src="${logoUrl}" alt="Saabai" height="36" style="height:36px;width:auto;display:block;border:0;">
          </a>
        </td>
        <td align="right" style="vertical-align:middle;">
          <p style="margin:0;font-size:10px;color:#62c5d1;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Advisory Enquiry</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Teal accent line -->
  <tr><td style="background:#62c5d1;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:40px 40px 32px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#62c5d1;letter-spacing:1.8px;text-transform:uppercase;">New Enquiry</p>
    <h1 style="margin:0 0 32px;font-size:24px;font-weight:700;color:#0b092e;letter-spacing:-0.4px;line-height:1.3;">${escapeHtml(name)} at ${escapeHtml(company)}</h1>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #ebebeb;margin:0 0 30px;">
      <tr>
        <td style="padding:14px 0;font-size:11px;font-weight:700;color:#9a9a9a;text-transform:uppercase;letter-spacing:1.4px;width:110px;border-bottom:1px solid #ebebeb;vertical-align:top;">Email</td>
        <td style="padding:14px 0;font-size:15px;color:#0b092e;border-bottom:1px solid #ebebeb;"><a href="mailto:${escapeHtml(email)}" style="color:#0b092e;text-decoration:none;font-weight:600;border-bottom:1px solid #62c5d1;">${escapeHtml(email)}</a></td>
      </tr>
      <tr>
        <td style="padding:14px 0;font-size:11px;font-weight:700;color:#9a9a9a;text-transform:uppercase;letter-spacing:1.4px;border-bottom:1px solid #ebebeb;vertical-align:top;">Company</td>
        <td style="padding:14px 0;font-size:15px;color:#0b092e;border-bottom:1px solid #ebebeb;">${escapeHtml(company)}</td>
      </tr>
      ${role ? `<tr>
        <td style="padding:14px 0;font-size:11px;font-weight:700;color:#9a9a9a;text-transform:uppercase;letter-spacing:1.4px;border-bottom:1px solid #ebebeb;vertical-align:top;">Role</td>
        <td style="padding:14px 0;font-size:15px;color:#0b092e;border-bottom:1px solid #ebebeb;">${escapeHtml(role)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:14px 0;font-size:11px;font-weight:700;color:#9a9a9a;text-transform:uppercase;letter-spacing:1.4px;vertical-align:top;">Submitted</td>
        <td style="padding:14px 0;font-size:14px;color:#6a6a6a;">${ts} AEST</td>
      </tr>
    </table>

    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#62c5d1;letter-spacing:1.8px;text-transform:uppercase;">Message</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafbfc;border-left:3px solid #62c5d1;border-radius:0 8px 8px 0;margin:0 0 32px;">
      <tr><td style="padding:22px 24px;">
        <p style="margin:0;font-size:15px;line-height:1.75;color:#1a1a1a;white-space:pre-wrap;">${escapeHtml(message)}</p>
      </td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#0b092e;border-radius:8px;mso-padding-alt:0;">
          <a href="mailto:${escapeHtml(email)}?subject=Re%3A%20Your%20advisory%20enquiry" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;border-radius:8px;">Reply to ${escapeHtml(firstName)} &rarr;</a>
        </td>
      </tr>
    </table>

    <p style="margin:18px 0 0;font-size:12px;color:#9a9a9a;line-height:1.6;">
      Reply-to is already set to ${escapeHtml(firstName)}, so hitting reply in any mail client works too.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0b092e;padding:24px 40px;border-radius:0 0 14px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.3px;">
            <a href="${siteUrl}" style="color:#62c5d1;text-decoration:none;">saabai.ai</a>
          </p>
          <p style="margin:0;font-size:11px;color:#7a7a7a;letter-spacing:0.3px;line-height:1.6;">
            AI advisory and automation for professional firms. Australia.
          </p>
        </td>
        <td align="right" style="vertical-align:middle;">
          <p style="margin:0;font-size:10px;color:#62c5d1;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;">Confidential</p>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;

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
