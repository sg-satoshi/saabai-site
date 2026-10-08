/**
 * Account emails that never contain a password.
 *
 * New accounts get a welcome email with a single-use "set your password" link
 * (72 hours) and a reminder that they can always use "Email me a sign-in link"
 * on the login page. Reset requests get a 1-hour single-use reset link.
 */
import { Resend } from "resend";
import { createPasswordToken, setPasswordUrl, siteBaseUrl, WHOLESALE_SITE_URL } from "./password-tokens";

export type EmailBrand = "saabai" | "wholesale-homes";

interface BrandConfig {
  from: string;
  label: string;
  headerBg: string;
  accent: string;
  footerName: string;
  footerUrl: string;
  signInUrl: string;
}

function brandConfig(brand: EmailBrand): BrandConfig {
  if (brand === "wholesale-homes") {
    return {
      from: "Wholesale Homes <hello@wholesalehomes.com.au>",
      label: "Wholesale Homes Australia",
      headerBg: "#0d1b2a",
      accent: "#0891b2",
      footerName: "Wholesale Homes Australia",
      footerUrl: "https://wholesalehomes.com.au",
      signInUrl: `${WHOLESALE_SITE_URL}/client-login`,
    };
  }
  return {
    from: "Saabai <noreply@saabai.ai>",
    label: "Saabai Client Portal",
    headerBg: "#0b092e",
    accent: "#0f766e",
    footerName: "Saabai",
    footerUrl: "https://www.saabai.ai",
    signInUrl: `${siteBaseUrl()}/login`,
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function shell(b: BrandConfig, title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td style="background:${b.headerBg};padding:28px 36px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${b.accent === "#0f766e" ? "#62c5d1" : b.accent};">${escapeHtml(b.label)}</p>
        <h1 style="margin:10px 0 0;font-size:21px;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
      </td></tr>
      <tr><td style="padding:30px 36px;">${inner}</td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid rgba(0,0,0,0.06);">
        <p style="margin:0;font-size:11px;color:#9CA3AF;">${escapeHtml(b.footerName)} · <a href="${b.footerUrl}" style="color:${b.accent};text-decoration:none;">${escapeHtml(b.footerUrl.replace(/^https:\/\//, ""))}</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function button(b: BrandConfig, href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 36px;border-radius:999px;background:${b.accent};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>
        </td></tr></table>`;
}

export function buildWelcomeEmail(opts: {
  name: string;
  email: string;
  setPasswordLink: string;
  brand?: EmailBrand;
  intro?: string;
  /** Mention "Email me a sign-in link". Off for admins, who can't use it. */
  mentionMagicLink?: boolean;
}): string {
  const b = brandConfig(opts.brand ?? "saabai");
  const first = escapeHtml((opts.name || "").split(" ")[0] || "there");
  const intro = escapeHtml(opts.intro ?? "Your client account is ready.");
  const magicHint = (opts.brand ?? "saabai") === "saabai" && opts.mentionMagicLink !== false
    ? `<p style="margin:0 0 10px;font-size:13px;color:#5C6670;line-height:1.6;">Prefer not to use a password? On the <a href="${escapeHtml(b.signInUrl)}" style="color:${b.accent};">sign-in page</a> you can choose "Email me a sign-in link" at any time.</p>`
    : "";
  return shell(b, "Your account is ready", `
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.6;">Hi ${first},</p>
        <p style="margin:14px 0 0;font-size:14px;color:#5C6670;line-height:1.6;">${intro} Your login email is <strong>${escapeHtml(opts.email)}</strong>. Choose your password using the button below. The link works once and expires in 72 hours.</p>
        ${button(b, opts.setPasswordLink, "Set your password")}
        ${magicHint}
        <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">If the link has expired, use "Forgot password" on the sign-in page to get a fresh one.</p>`);
}

export function buildPasswordResetEmail(opts: { name: string; resetLink: string; brand?: EmailBrand }): string {
  const b = brandConfig(opts.brand ?? "saabai");
  const first = escapeHtml((opts.name || "").split(" ")[0] || "there");
  return shell(b, "Reset your password", `
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.6;">Hi ${first},</p>
        <p style="margin:14px 0 0;font-size:14px;color:#5C6670;line-height:1.6;">We received a request to reset the password for your ${escapeHtml(b.footerName)} account. The link below works once and expires in 1 hour.</p>
        ${button(b, opts.resetLink, "Choose a new password")}
        <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">If you didn't ask for this, you can safely ignore this email. Your password won't change.</p>`);
}

async function send(to: string, subject: string, html: string, from: string, devLink: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Dev convenience only. Never logs a password, and never runs in production.
    if (process.env.NODE_ENV !== "production") console.log(`[account-emails] (dev, no RESEND_API_KEY) ${subject}: ${devLink}`);
    return false;
  }
  try {
    await new Resend(key).emails.send({ from, to, subject, html });
    return true;
  } catch (err) {
    console.error("[account-emails] send failed", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Create a 72-hour set-password link and email it. Never throws. */
export async function sendWelcomeEmail(opts: {
  name: string;
  email: string;
  brand?: EmailBrand;
  subject?: string;
  intro?: string;
  mentionMagicLink?: boolean;
}): Promise<boolean> {
  try {
    const token = await createPasswordToken(opts.email, "welcome");
    if (!token) return false;
    const link = setPasswordUrl(token, "welcome", opts.brand ?? "saabai");
    const b = brandConfig(opts.brand ?? "saabai");
    const html = buildWelcomeEmail({ name: opts.name, email: opts.email, setPasswordLink: link, brand: opts.brand, intro: opts.intro, mentionMagicLink: opts.mentionMagicLink });
    return await send(opts.email, opts.subject ?? "Your Saabai account is ready", html, b.from, link);
  } catch (err) {
    console.error("[account-emails] welcome failed", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Create a 1-hour reset link and email it. Never throws. */
export async function sendPasswordResetEmail(opts: { name: string; email: string; brand?: EmailBrand }): Promise<boolean> {
  try {
    const token = await createPasswordToken(opts.email, "reset");
    if (!token) return false;
    const brand = opts.brand ?? "saabai";
    const link = setPasswordUrl(token, "reset", brand);
    const html = buildPasswordResetEmail({ name: opts.name, resetLink: link, brand });
    const b = brandConfig(brand);
    return await send(opts.email, `Reset your ${b.footerName} password`, html, b.from, link);
  } catch (err) {
    console.error("[account-emails] reset failed", err instanceof Error ? err.message : err);
    return false;
  }
}
