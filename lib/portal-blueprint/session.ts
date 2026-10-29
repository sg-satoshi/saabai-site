/**
 * Blueprint portal session: its own cookie and its own scope claim, so a
 * Blueprint buyer can never be mistaken for a dashboard client, Lex user or
 * admin (and vice versa). HMAC-SHA256, keyed from PORTAL_SESSION_SECRET with a
 * domain-separation suffix. Sliding 7 day expiry.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const BP_COOKIE = "bp_portal";
export const BP_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCOPE = "blueprint";

function secret(): string {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s) throw new Error("PORTAL_SESSION_SECRET is not set");
  return `${s}:bp-portal-v1`;
}

export function signBpSession(email: string, ttlMs = BP_SESSION_TTL_MS, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), scope: SCOPE, exp: now + ttlMs })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyBpSession(token: string | undefined | null, now = Date.now()): { email: string; exp: number } | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const got = Buffer.from(sig, "base64url");
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: string; scope?: string; exp?: number };
    if (d.scope !== SCOPE || !d.email || typeof d.exp !== "number" || d.exp < now) return null;
    return { email: d.email, exp: d.exp };
  } catch {
    return null;
  }
}

export function bpCookieOptions(maxAgeMs = BP_SESSION_TTL_MS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

export async function getBpSession(): Promise<{ email: string; exp: number } | null> {
  const t = (await cookies()).get(BP_COOKIE)?.value;
  try {
    return verifyBpSession(t);
  } catch {
    return null;
  }
}

/** Same-origin check for mutating routes. Requests with no Origin header (non-browser) pass; the cookie is still required. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
    if (o.host.toLowerCase() === host) return true;
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    if (base && o.host.toLowerCase() === new URL(base).host.toLowerCase()) return true;
  } catch {
    /* fall through */
  }
  return false;
}
