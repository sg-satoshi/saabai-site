/**
 * Passwordless ("magic link") sign-in for Saabai CLIENT accounts.
 *
 * - Only emails already in the client user list (Redis directory users with
 *   role "user", or env-var clients) can receive a link. Admin accounts are
 *   excluded on purpose: admins keep using their password.
 * - Tokens are 256-bit crypto-random, single-use (atomic GETDEL) and expire
 *   after 15 minutes. Only a SHA-256 hash of the token is stored in Redis.
 * - The post-login redirect is validated to a same-origin relative path.
 * - Callers must respond identically whether or not the email exists.
 */
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";
import { getRedis } from "./redis";
import { getDirectoryUser } from "./user-directory";
import { loadClients } from "./clients";
import { safeRedirect } from "./safe-redirect";

export const MAGIC_LINK_TTL_SECONDS = 15 * 60;
const MAX_LINKS_PER_WINDOW = 5;

const TOKEN_PREFIX = "client:magic:token:";
const RATE_PREFIX = "client:magic:rate:";

export interface MagicLinkRecord {
  clientId: string;
  email: string;
  redirect: string;
}

export interface EligibleClient {
  clientId: string;
  name: string;
  email: string;
}

export function generateMagicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function baseUrl(): string {
  // Never derive the link host from the request (Host-header injection).
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai").replace(/\/+$/, "");
}

/** Look up a client account that may use magic-link sign-in. Admins excluded. */
export async function findEligibleClient(rawEmail: string): Promise<EligibleClient | null> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) return null;
  const adminId = process.env.SAABAI_ADMIN_ID ?? "saabai";

  const dirUser = await getDirectoryUser(email);
  if (dirUser) {
    if (dirUser.role === "admin" || dirUser.id === adminId) return null;
    return { clientId: dirUser.id, name: dirUser.name || "", email };
  }

  const envClient = loadClients().find((c) => c.email.toLowerCase() === email);
  if (envClient && envClient.id !== adminId) {
    return { clientId: envClient.id, name: envClient.name, email };
  }
  return null;
}

/** Store a new single-use token for this client. Returns the raw token. */
export async function createMagicLink(client: EligibleClient, redirect: unknown): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const token = generateMagicToken();
  const record: MagicLinkRecord = {
    clientId: client.clientId,
    email: client.email,
    redirect: safeRedirect(redirect, "/dashboard"),
  };
  await redis.set(`${TOKEN_PREFIX}${hashToken(token)}`, JSON.stringify(record), { ex: MAGIC_LINK_TTL_SECONDS });
  return token;
}

/** Atomically consume a token. Returns null if missing, expired or already used. */
export async function consumeMagicLink(token: unknown): Promise<MagicLinkRecord | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.getdel(`${TOKEN_PREFIX}${hashToken(token)}`);
  if (!raw) return null;
  let rec: Partial<MagicLinkRecord> | null = null;
  if (typeof raw === "string") {
    try { rec = JSON.parse(raw); } catch { rec = null; }
  } else {
    rec = raw as Partial<MagicLinkRecord>;
  }
  if (!rec?.clientId || !rec.email) return null;
  return { clientId: rec.clientId, email: rec.email, redirect: safeRedirect(rec.redirect, "/dashboard") };
}

/** Simple per-email throttle: max 5 links per 15 minutes. */
async function underRateLimit(email: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `${RATE_PREFIX}${hashToken(email)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, MAGIC_LINK_TTL_SECONDS);
  return n <= MAX_LINKS_PER_WINDOW;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function buildMagicLinkEmail(name: string, link: string): string {
  const first = escapeHtml((name || "").split(" ")[0] || "there");
  const href = escapeHtml(link);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td style="background:#0b092e;padding:28px 36px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#62c5d1;">Saabai Client Portal</p>
        <h1 style="margin:10px 0 0;font-size:21px;font-weight:700;color:#ffffff;">Your sign-in link</h1>
      </td></tr>
      <tr><td style="padding:30px 36px;">
        <p style="margin:0;font-size:15px;color:#111827;line-height:1.6;">Hi ${first},</p>
        <p style="margin:14px 0 0;font-size:14px;color:#5C6670;line-height:1.6;">Here is your link to sign in to the Saabai Client Portal. It works once and expires in 15 minutes.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
          <a href="${href}" style="display:inline-block;padding:14px 36px;border-radius:999px;background:#0f766e;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Sign in</a>
        </td></tr></table>
        <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">If you didn't ask for this, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid rgba(0,0,0,0.06);">
        <p style="margin:0;font-size:11px;color:#9CA3AF;">Saabai · <a href="https://www.saabai.ai" style="color:#0f766e;text-decoration:none;">www.saabai.ai</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/**
 * Full flow for a sign-in request. Never throws and never reveals whether the
 * email exists; run it after the response is sent so timing is identical too.
 */
export async function processMagicLinkRequest(email: unknown, redirect: unknown): Promise<void> {
  try {
    if (typeof email !== "string") return;
    const client = await findEligibleClient(email);
    if (!client) return;
    if (!(await underRateLimit(client.email))) return;
    const token = await createMagicLink(client, redirect);
    if (!token) return;
    const link = `${baseUrl()}/login/magic?token=${encodeURIComponent(token)}`;

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      if (process.env.NODE_ENV !== "production") console.log("[client-magic-link] (dev, no RESEND_API_KEY) link:", link);
      return;
    }
    await new Resend(key).emails.send({
      from: "Saabai <noreply@saabai.ai>",
      to: client.email,
      subject: "Your Saabai sign-in link",
      html: buildMagicLinkEmail(client.name, link),
    });
  } catch (err) {
    console.error("[client-magic-link] request failed", err instanceof Error ? err.message : err);
  }
}
