/**
 * Wholesale Homes admin sign-in (Node runtime only).
 *
 * Who counts as a Wholesale admin:
 *   1. Whoever holds the WHOLESALE_ADMIN_EMAIL / WHOLESALE_ADMIN_PASS login
 *      (the existing Wholesale admin credential, plain text or scrypt hash).
 *   2. A signed-in Saabai admin (saabai_session whose user is an admin), so
 *      Saabai can support the client without a separate password.
 * Ordinary Wholesale client accounts are never admins.
 *
 * A successful sign-in issues a signed, HttpOnly "wh_admin_session" cookie,
 * signed with its own key derived from SAABAI_SESSION_SECRET, so it can't be
 * swapped for a Saabai, Lex or Wholesale client session (or vice versa). It
 * carries a fingerprint of the admin password, so changing that env value
 * signs every Wholesale admin out.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { verifyPassword } from "./password";
import { verifySessionToken, isAdminSession, COOKIE_NAME as SAABAI_COOKIE } from "./auth";

export const WH_ADMIN_COOKIE = "wh_admin_session";
export { WH_ADMIN_BASE } from "./wholesale-paths";
const SESSION_HOURS = 12;
const KEY_LABEL = "saabai/wholesale-homes/admin-session/v1";

export interface WholesaleAdmin {
  email: string;
  source: "wholesale-admin" | "saabai-admin";
}

interface TokenPayload {
  aud: "wholesale-homes-admin";
  email: string;
  pwv: string;
  exp: number;
}

function signingKey(): Buffer {
  const secret = process.env.SAABAI_SESSION_SECRET;
  if (!secret) throw new Error("SAABAI_SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(KEY_LABEL).digest();
}

function fingerprint(stored: string): string {
  return createHash("sha256").update(`wh-admin-pwv:${stored}`).digest("base64url").slice(0, 16);
}

function adminCreds(): { email: string; pass: string } | null {
  const email = process.env.WHOLESALE_ADMIN_EMAIL?.trim().toLowerCase();
  const pass = process.env.WHOLESALE_ADMIN_PASS;
  return email && pass ? { email, pass } : null;
}

export function wholesaleAdminConfigured(): boolean {
  return adminCreds() !== null;
}

/** Check the Wholesale admin credential. Constant work whether or not the email matches. */
export async function authenticateWholesaleAdmin(rawEmail: unknown, rawPassword: unknown): Promise<string | null> {
  const creds = adminCreds();
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const password = typeof rawPassword === "string" && rawPassword.length <= 256 ? rawPassword : "";
  const { ok } = await verifyPassword(password || "x", creds?.pass);
  if (!creds || !ok || !password || email !== creds.email) return null;
  return createWholesaleAdminToken(creds.email, creds.pass);
}

export function createWholesaleAdminToken(email: string, storedPass: string): string {
  const payload: TokenPayload = {
    aud: "wholesale-homes-admin",
    email,
    pwv: fingerprint(storedPass),
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyAdminToken(token: string | undefined | null): WholesaleAdmin | null {
  if (!token || token.length > 4096) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  try {
    const sig = Buffer.from(token.slice(dot + 1), "base64url");
    const expected = createHmac("sha256", signingKey()).update(body).digest();
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<TokenPayload>;
    if (p.aud !== "wholesale-homes-admin" || typeof p.email !== "string" || typeof p.exp !== "number") return null;
    if (p.exp < Date.now() / 1000) return null;
    const creds = adminCreds();
    if (!creds || creds.email !== p.email || fingerprint(creds.pass) !== p.pwv) return null;
    return { email: p.email, source: "wholesale-admin" };
  } catch {
    return null;
  }
}

/** Minimal cookie reader so this works with req.cookies and next/headers cookies(). */
export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

/**
 * The signed-in Wholesale admin, if any: a valid wh_admin_session, or a
 * Saabai admin session.
 */
export async function getWholesaleAdmin(cookies: CookieReader): Promise<WholesaleAdmin | null> {
  const own = verifyAdminToken(cookies.get(WH_ADMIN_COOKIE)?.value);
  if (own) return own;
  const saabai = cookies.get(SAABAI_COOKIE)?.value;
  if (!saabai) return null;
  const session = await verifySessionToken(saabai);
  if (!session) return null;
  if (!(await isAdminSession(session.clientId))) return null;
  return { email: session.clientId, source: "saabai-admin" };
}

export function wholesaleAdminCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${WH_ADMIN_COOKIE}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearWholesaleAdminCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${WH_ADMIN_COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}
