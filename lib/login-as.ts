/**
 * Admin "Login as": a full-admin user signs in as a non-admin directory user for up to 1 hour.
 *
 * - saabai_session is swapped for a 1-hour session of the target user, so every page (/lex, /dashboard, ...)
 *   renders exactly as it does for them.
 * - The admin's own session token rides in a signed HttpOnly marker cookie (saabai_login_as) and is
 *   restored by Exit. A small readable cookie (saabai_viewing_as) carries only the display name for the banner.
 * - Password changes and billing actions refuse while the marker is present (rejectIfLoginAs).
 * - Start and stop are written to the impersonation audit log.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const LOGIN_AS_COOKIE = "saabai_login_as";
export const LOGIN_AS_LABEL_COOKIE = "saabai_viewing_as";
export const LOGIN_AS_TTL_SECONDS = 60 * 60;

export type LoginAsPayload = {
  adminId: string;
  adminToken: string;
  targetId: string;
  targetEmail: string;
  targetName: string;
  sessionId: string;
  exp: number; // epoch ms
};

function secret(): string {
  const s = process.env.IMPERSONATE_SECRET || process.env.SAABAI_SESSION_SECRET;
  if (!s) throw new Error("IMPERSONATE_SECRET / SAABAI_SESSION_SECRET is not set");
  return s;
}

export function signLoginAs(input: Omit<LoginAsPayload, "exp" | "sessionId">, now = Date.now()): { token: string; payload: LoginAsPayload } {
  const payload: LoginAsPayload = { ...input, targetEmail: input.targetEmail.trim().toLowerCase(), sessionId: randomBytes(12).toString("hex"), exp: now + LOGIN_AS_TTL_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(`login-as:${body}`).digest("base64url");
  return { token: `${body}.${sig}`, payload };
}

export function verifyLoginAs(token: string | undefined | null, now = Date.now()): LoginAsPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const want = createHmac("sha256", secret()).update(`login-as:${body}`).digest("base64url");
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(body, "base64url").toString()) as LoginAsPayload;
    if (!d?.adminId || !d?.adminToken || !d?.targetId || typeof d.exp !== "number" || d.exp < now) return null;
    return d;
  } catch {
    return null;
  }
}

/** Only plain client users can be viewed as. Admins and staff never can. */
export function canLoginAs(target: { role?: string; disabled?: boolean } | null | undefined): boolean {
  return !!target && target.role === "user";
}

function cookieAttrs(): string {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}
export function loginAsCookieHeaders(token: string, name: string): string[] {
  const label = encodeURIComponent(name.slice(0, 80));
  return [
    `${LOGIN_AS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LOGIN_AS_TTL_SECONDS}${cookieAttrs()}`,
    `${LOGIN_AS_LABEL_COOKIE}=${label}; Path=/; SameSite=Lax; Max-Age=${LOGIN_AS_TTL_SECONDS}${cookieAttrs()}`,
  ];
}
export function clearLoginAsCookieHeaders(): string[] {
  return [
    `${LOGIN_AS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieAttrs()}`,
    `${LOGIN_AS_LABEL_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${cookieAttrs()}`,
  ];
}

function cookieFrom(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const t = part.trim();
    const eq = t.indexOf("=");
    if (eq > 0 && t.slice(0, eq) === name) return t.slice(eq + 1);
  }
  return undefined;
}
export function readLoginAs(req: Request): LoginAsPayload | null {
  return verifyLoginAs(cookieFrom(req.headers.get("cookie"), LOGIN_AS_COOKIE));
}

export const LOGIN_AS_BLOCKED = "Not available while you are viewing as another user. Exit first.";

/**
 * Call at the top of password, sign-out-everywhere and billing handlers. Any marker cookie blocks,
 * even an expired or unverifiable one, so a stale marker can never let an action through.
 */
export function rejectIfLoginAs(req: Request): Response | null {
  if (!cookieFrom(req.headers.get("cookie"), LOGIN_AS_COOKIE)) return null;
  return Response.json({ error: LOGIN_AS_BLOCKED, code: "login_as_blocked" }, { status: 403 });
}
