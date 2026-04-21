/**
 * POST /api/portal/login
 * Sends a magic link to the firm's email address.
 * Token is stored in Redis with a 15-minute TTL.
 */

import { getRedis } from "../../../../lib/redis";
import { Resend } from "resend";

export const runtime = "nodejs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai.ai";

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function magicLinkEmail(email: string, link: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to Saabai Client Portal</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#E0BC6A 0%,#C9A84C 100%);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#0a1628;font-family:Georgia,serif;">L</div>
                <span style="font-size:18px;font-weight:800;color:#0a1628;letter-spacing:-0.3px;">Saabai</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,0.06);overflow:hidden;">

              <!-- Gold top accent -->
              <div style="height:4px;background:linear-gradient(90deg,#C9A84C 0%,#E0BC6A 50%,#C9A84C 100%);"></div>

              <div style="padding:40px 40px 36px;">
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Sign in to your portal</h1>
                <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
                  Click the button below to sign in to your Saabai Client Portal. This link is valid for <strong style="color:#111827;">15 minutes</strong> and can only be used once.
                </p>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="border-radius:10px;background:#C9A84C;">
                      <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0a1628;text-decoration:none;letter-spacing:0.1px;">
                        Sign in to Portal →
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- URL fallback -->
                <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">Or copy this link into your browser:</p>
                <p style="margin:0;font-size:11px;color:#6b7280;word-break:break-all;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;font-family:monospace;">${link}</p>
              </div>

              <!-- Footer -->
              <div style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
                  This email was sent to <strong>${email}</strong> because a sign-in was requested for your Saabai Client Portal account.
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer text -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                <a href="https://saabai.ai" style="color:#9ca3af;">saabai.ai</a> · AI agents for professional services
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalised = email.trim().toLowerCase();

    // Generate token and store in Redis (15 min TTL)
    const redis = getRedis();
    if (!redis) {
      // Graceful degradation — log and return ok so we don't surface infra issues
      console.error("[portal/login] Redis unavailable");
      return Response.json({ ok: true });
    }

    const token = generateToken();
    await redis.set(`portal:token:${token}`, normalised, "EX", 900);

    // Build magic link
    const link = `${BASE_URL}/api/portal/auth?token=${token}`;

    // Send via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "Saabai Portal <portal@saabai.ai>",
        to: normalised,
        subject: "Your Saabai Client Portal sign-in link",
        html: magicLinkEmail(normalised, link),
      });
    } else {
      // Dev fallback — log link to console
      console.log("[portal/login] Magic link:", link);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[portal/login]", err);
    return Response.json({ error: "Failed to send magic link" }, { status: 500 });
  }
}
