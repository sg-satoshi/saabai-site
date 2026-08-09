/**
 * Create a client login on purchase + email them access. Reuses the directory
 * user store and the Resend welcome-email pattern (see approve-lead route).
 */
import { Resend } from "resend";
import { saveDirectoryUser, getDirectoryUser, type DirectoryUser } from "./user-directory";

const LOGIN_URL = "https://www.saabai.ai/login";

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw + "!";
}

function buildWelcomeEmail(name: string, email: string, password: string, productName: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td style="background:#0b092e;padding:32px 36px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#62c5d1;">Saabai</p>
        <h1 style="margin:12px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Your account is ready</h1>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.6;">Hi ${name},</p>
        <p style="margin:16px 0 0;font-size:14px;color:#5C6670;line-height:1.6;">
          Thanks for signing up for ${productName}. Your client account is ready, so you can log in any time to view your billing and invoices.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8f6f2;border-radius:12px;border:1px solid rgba(0,0,0,0.06);">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0f766e;">Your Login Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
              <tr><td style="padding:6px 0;font-size:12px;color:#5C6670;width:80px;">Email</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${email}</td></tr>
              <tr><td style="padding:6px 0;font-size:12px;color:#5C6670;">Password</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;font-family:monospace;">${password}</td></tr>
            </table>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${LOGIN_URL}" style="display:inline-block;padding:14px 36px;border-radius:999px;background:#0f766e;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Sign In</a>
        </td></tr></table>
        <p style="margin:24px 0 0;font-size:13px;color:#5C6670;line-height:1.6;">We recommend changing your password after your first login.</p>
      </td></tr>
      <tr><td style="padding:20px 36px;border-top:1px solid rgba(0,0,0,0.06);">
        <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.5;">Saabai · <a href="https://www.saabai.ai" style="color:#0f766e;text-decoration:none;">www.saabai.ai</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Create the client login if it does not exist yet, and email their access. Idempotent. */
export async function ensureClientAccount(opts: { name: string; email: string; productName: string }): Promise<{ created: boolean; user: DirectoryUser }> {
  const email = opts.email.toLowerCase();
  const existing = await getDirectoryUser(email);
  if (existing) return { created: false, user: existing };

  const password = generatePassword();
  const user: DirectoryUser = {
    id: email.replace(/[^a-z0-9]/g, "-"),
    name: opts.name || email,
    email,
    password,
    role: "user",
    dashboardUrl: "/dashboard",
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await saveDirectoryUser(user);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Saabai <noreply@saabai.ai>",
      to: email,
      subject: "Your Saabai account is ready",
      html: buildWelcomeEmail(opts.name || "there", email, password, opts.productName),
    });
  } catch (e) {
    console.error("[client-account] welcome email failed", e);
  }

  return { created: true, user };
}
