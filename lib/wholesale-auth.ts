/**
 * Wholesale Homes client portal sign-in (Node runtime only).
 *
 * Two ways in:
 *   1. Per-user accounts: the directory users that approve-lead creates
 *      (dashboardUrl under /sites/wholesale-homes, or siteId "wholesale-homes").
 *      Passwords are scrypt hashes; legacy plaintext is upgraded on login.
 *   2. Fallback: the existing shared login in WHOLESALE_CLIENT_EMAIL /
 *      WHOLESALE_CLIENT_PASS, so current users aren't locked out.
 *
 * A successful sign-in issues a signed, HttpOnly "wh_session" cookie. It is
 * signed with a key derived from SAABAI_SESSION_SECRET but separate from the
 * Saabai and Lex session keys, so it can never be used as either of those.
 * The session also carries a fingerprint of the current password, so changing
 * the password (or deleting the account) signs that user out everywhere.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { getDirectoryUser, type DirectoryUser } from "./user-directory";
import { verifyPassword } from "./password";
import { upgradeStoredPassword } from "./password-auth";

export const WH_COOKIE = "wh_session";
export const WH_SITE_ID = "wholesale-homes";
const WH_DASHBOARD_PREFIX = "/sites/wholesale-homes";
const SESSION_DAYS = 7;
const KEY_LABEL = "saabai/wholesale-homes/client-session/v1";

export interface WholesaleSession {
  email: string;
  name: string;
  source: "account" | "shared";
}

interface TokenPayload {
  aud: "wholesale-homes";
  email: string;
  name: string;
  src: "account" | "shared";
  pwv: string;
  exp: number;
}

export function isWholesaleAccount(user: Pick<DirectoryUser, "dashboardUrl" | "siteId"> | null | undefined): boolean {
  if (!user) return false;
  return user.siteId === WH_SITE_ID || (typeof user.dashboardUrl === "string" && user.dashboardUrl.startsWith(WH_DASHBOARD_PREFIX + "/"));
}

function signingKey(): Buffer {
  const secret = process.env.SAABAI_SESSION_SECRET;
  if (!secret) throw new Error("SAABAI_SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(KEY_LABEL).digest();
}

/** Short fingerprint of the stored password value (never the password itself). */
function passwordFingerprint(stored: string): string {
  return createHash("sha256").update(`wh-pwv:${stored}`).digest("base64url").slice(0, 16);
}

function sharedCreds(): { email: string; pass: string } | null {
  const email = process.env.WHOLESALE_CLIENT_EMAIL?.trim().toLowerCase();
  const pass = process.env.WHOLESALE_CLIENT_PASS;
  return email && pass ? { email, pass } : null;
}

interface AuthOk {
  session: WholesaleSession;
  pwv: string;
}

/** Check email + password against per-user accounts, then the shared fallback. */
export async function authenticateWholesale(rawEmail: unknown, rawPassword: unknown): Promise<AuthOk | null> {
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  if (!email || !password || email.length > 254 || password.length > 256) {
    await verifyPassword("x", undefined);
    return null;
  }

  // 1. Per-user account created by approve-lead.
  const user = await getDirectoryUser(email);
  if (user && isWholesaleAccount(user)) {
    const res = await verifyPassword(password, user.password);
    if (res.ok) {
      let stored = user.password;
      if (res.needsRehash && (await upgradeStoredPassword(email, user.password, password))) {
        stored = (await getDirectoryUser(email))?.password ?? stored;
      }
      return { session: { email, name: user.name || "", source: "account" }, pwv: passwordFingerprint(stored) };
    }
  } else {
    await verifyPassword(password, undefined); // same work whether or not the account exists
  }

  // 2. Shared fallback login (env vars, plain text or scrypt hash).
  const shared = sharedCreds();
  const res = await verifyPassword(password, shared?.pass);
  if (shared && res.ok && email === shared.email) {
    return { session: { email, name: "", source: "shared" }, pwv: passwordFingerprint(shared.pass) };
  }
  return null;
}

export function createWholesaleSessionToken(auth: AuthOk): string {
  const payload: TokenPayload = {
    aud: "wholesale-homes",
    email: auth.session.email,
    name: auth.session.name,
    src: auth.session.source,
    pwv: auth.pwv,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function decodeToken(token: string): TokenPayload | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  try {
    const sig = Buffer.from(token.slice(dot + 1), "base64url");
    const expected = createHmac("sha256", signingKey()).update(body).digest();
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<TokenPayload>;
    if (p.aud !== "wholesale-homes" || typeof p.email !== "string" || typeof p.exp !== "number" || typeof p.pwv !== "string") return null;
    if (p.src !== "account" && p.src !== "shared") return null;
    if (p.exp < Date.now() / 1000) return null;
    return p as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a wh_session cookie value AND that the account is still valid
 * (still exists, still a Wholesale account, password unchanged).
 */
export async function getWholesaleSession(token: string | undefined | null): Promise<WholesaleSession | null> {
  if (!token) return null;
  const p = decodeToken(token);
  if (!p) return null;
  try {
    if (p.src === "account") {
      const user = await getDirectoryUser(p.email);
      if (!user || !isWholesaleAccount(user) || passwordFingerprint(user.password) !== p.pwv) return null;
      return { email: p.email, name: user.name || p.name || "", source: "account" };
    }
    const shared = sharedCreds();
    if (!shared || shared.email !== p.email || passwordFingerprint(shared.pass) !== p.pwv) return null;
    return { email: p.email, name: "", source: "shared" };
  } catch {
    return null;
  }
}

export function wholesaleSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${WH_COOKIE}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 3600}`;
}

export function clearWholesaleSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${WH_COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}

/**
 * Where the Wholesale client login lives for this host. On wholesalehomes.com.au
 * the site is served at the root; on saabai.ai / previews it's under /sites/….
 */
export function wholesaleBasePath(host: string | null | undefined): string {
  const h = (host || "").split(":")[0].toLowerCase();
  const isSaabaiHost = h === "saabai.ai" || h.endsWith(".saabai.ai") || h.endsWith(".vercel.app") || h === "localhost" || h.startsWith("127.");
  return isSaabaiHost ? WH_DASHBOARD_PREFIX : "";
}
