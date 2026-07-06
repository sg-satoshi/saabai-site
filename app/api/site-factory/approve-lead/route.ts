import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { saveDirectoryUser, getDirectoryUser } from "../../../../lib/user-directory";

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = "edge";

const SITE_NAME = "Wholesale Homes Australia";
const SITE_URL = "https://wholesalehomes.com.au";
const LOGIN_URL = `${SITE_URL}/client-login`;

function buildWelcomeEmail(name: string, email: string, password: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:#0d1b2a;padding:32px 36px 28px;text-align:center;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#0891b2;">Wholesale Homes Australia</p>
            <h1 style="margin:12px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Welcome to the Portal</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0;font-size:15px;color:#1A2B3C;line-height:1.6;">Hi ${name},</p>
            <p style="margin:16px 0 0;font-size:14px;color:#5C6670;line-height:1.6;">
              Your application has been approved. You now have access to browse our full inventory of pre-market house and land packages at wholesale pricing.
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8f6f2;border-radius:12px;border:1px solid rgba(0,0,0,0.06);">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0891b2;">Your Login Details</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                  <tr>
                    <td style="padding:6px 0;font-size:12px;color:#5C6670;white-space:nowrap;width:80px;">Email</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1A2B3C;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;color:#5C6670;white-space:nowrap;">Password</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1A2B3C;font-family:monospace;">${password}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${LOGIN_URL}" style="display:inline-block;padding:14px 36px;border-radius:999px;background:#0891b2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
                  Sign In to Your Portal
                </a>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#5C6670;line-height:1.6;">
              Once signed in, you can browse packages, use our calculators, and access resources to help with your investment decisions.
            </p>
            <p style="margin:12px 0 0;font-size:13px;color:#5C6670;line-height:1.6;">
              We recommend changing your password after your first login.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.5;">
              Wholesale Homes Australia<br>
              <a href="${SITE_URL}" style="color:#0891b2;text-decoration:none;">${SITE_URL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw + "!";
}

export async function POST(req: Request) {
  try {
    const { name, email, phone, buyer_type } = await req.json();

    if (!name || !email) {
      return Response.json({ error: "Name and email required" }, { status: 400 });
    }

    // Check if already exists
    const existing = await getDirectoryUser(email);
    if (existing) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    // Create user
    const password = generatePassword();
    const user = {
      id: email.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name,
      email: email.toLowerCase(),
      password,
      role: "user" as const,
      dashboardUrl: "/sites/wholesale-homes/client/dashboard",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await saveDirectoryUser(user);

    // Send welcome email
    try {
      await resend.emails.send({
        from: "Wholesale Homes <hello@wholesalehomes.com.au>",
        to: email,
        subject: `Welcome to Wholesale Homes — your portal is ready`,
        html: buildWelcomeEmail(name, email, password),
      });
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr);
      // Don't fail the whole request — user was created
    }

    return Response.json({
      success: true,
      message: `User created. Welcome email sent to ${email}.`,
    });
  } catch (error) {
    console.error("Approve lead error:", error);
    return Response.json({ error: "Failed to approve lead" }, { status: 500 });
  }
}
