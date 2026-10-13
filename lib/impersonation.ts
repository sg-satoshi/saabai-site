/**
 * Admin "View as client" impersonation.
 *
 * Separate short-lived (30 min) signed cookie. Admin saabai_session stays intact.
 * Read-only by default: mutating portal/dashboard actions must call
 * rejectIfImpersonatingReadOnly() and return 403.
 * No emails or notifications are sent to the client.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getRedis } from "./redis";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "./auth";
import {
  TRUST_COOKIE,
  verifyTrustToken,
  isTwoFactorEnabled,
  twoFactorDisabledByEnv,
} from "./admin-2fa";

export const IMPERSONATE_COOKIE = "portal_impersonate";
export const IMPERSONATE_TTL_SECONDS = 30 * 60;

export type ImpersonationPayload = {
  adminId: string;
  clientEmail: string;
  clientName: string;
  clientId: string;
  returnTo: string;
  sessionId: string;
  exp: number; // epoch ms
  readOnly: true;
};

function secret(): string {
  const s =
    process.env.IMPERSONATE_SECRET ||
    process.env.PORTAL_SESSION_SECRET ||
    process.env.SAABAI_SESSION_SECRET;
  if (!s) throw new Error("IMPERSONATE_SECRET / PORTAL_SESSION_SECRET is not set");
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function signImpersonation(
  input: Omit<ImpersonationPayload, "exp" | "readOnly" | "sessionId"> & {
    sessionId?: string;
  },
): { token: string; payload: ImpersonationPayload } {
  const payload: ImpersonationPayload = {
    adminId: input.adminId,
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientName: input.clientName,
    clientId: input.clientId,
    returnTo: input.returnTo || "/saabai-admin/customers",
    sessionId: input.sessionId || randomBytes(12).toString("hex"),
    exp: Date.now() + IMPERSONATE_TTL_SECONDS * 1000,
    readOnly: true,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(`impersonate:${body}`).digest("base64url");
  return { token: `${body}.${sig}`, payload };
}

export function verifyImpersonation(token: string | undefined | null): ImpersonationPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = createHmac("sha256", secret()).update(`impersonate:${body}`).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(want);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as ImpersonationPayload;
    if (!data?.clientEmail || !data?.adminId || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    if (data.readOnly !== true) return null;
    return data;
  } catch {
    return null;
  }
}

export function impersonationCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${IMPERSONATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${IMPERSONATE_TTL_SECONDS}${secure}`;
}

export function clearImpersonationCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${IMPERSONATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function parseCookieHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

export function readImpersonationFromRequest(req: Request): ImpersonationPayload | null {
  return verifyImpersonation(parseCookieHeader(req.headers.get("cookie"), IMPERSONATE_COOKIE));
}

/** For route handlers using next/headers cookies(). */
export async function readImpersonationFromCookies(): Promise<ImpersonationPayload | null> {
  try {
    const jar = await cookies();
    return verifyImpersonation(jar.get(IMPERSONATE_COOKIE)?.value);
  } catch {
    return null;
  }
}

export const READ_ONLY_MESSAGE =
  "You are viewing as a client (read-only). Exit View as client to make changes.";

export function impersonationForbiddenResponse(): Response {
  return Response.json(
    { error: READ_ONLY_MESSAGE, code: "impersonation_read_only" },
    { status: 403 },
  );
}

/** Call at the top of mutating portal/dashboard handlers. Returns a 403 Response or null. */
export function rejectIfImpersonatingReadOnly(req: Request): Response | null {
  const imp = readImpersonationFromRequest(req);
  if (imp) return impersonationForbiddenResponse();
  return null;
}

export async function rejectIfImpersonatingReadOnlyCookies(): Promise<Response | null> {
  const imp = await readImpersonationFromCookies();
  if (imp) return impersonationForbiddenResponse();
  return null;
}

export type ImpersonationAuditEvent = {
  id: string;
  action: "start" | "end";
  adminId: string;
  clientEmail: string;
  clientName: string;
  clientId: string;
  sessionId: string;
  ip: string;
  at: string;
};

const AUDIT_KEY = "impersonate:audit";
const AUDIT_MAX = 500;

export async function writeImpersonationAudit(
  event: Omit<ImpersonationAuditEvent, "id" | "at"> & { at?: string },
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const row: ImpersonationAuditEvent = {
    id: randomBytes(8).toString("hex"),
    at: event.at || new Date().toISOString(),
    action: event.action,
    adminId: event.adminId,
    clientEmail: event.clientEmail,
    clientName: event.clientName,
    clientId: event.clientId,
    sessionId: event.sessionId,
    ip: event.ip,
  };
  try {
    await redis.lpush(AUDIT_KEY, JSON.stringify(row));
    await redis.ltrim(AUDIT_KEY, 0, AUDIT_MAX - 1);
    // Per-session pointer for end correlation
    await redis.set(`impersonate:session:${row.sessionId}`, JSON.stringify(row), {
      ex: IMPERSONATE_TTL_SECONDS + 3600,
    });
  } catch (err) {
    console.error("[impersonation] audit failed", err instanceof Error ? err.message : err);
  }
}

export async function requireAdminWith2fa(req: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): Promise<{ adminId: string } | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  if (!(await isAdminSession(session.clientId))) return null;

  const adminId = session.clientId;
  if (twoFactorDisabledByEnv()) return { adminId };
  const enabled = await isTwoFactorEnabled(adminId);
  if (!enabled) return { adminId };
  const trusted = verifyTrustToken(req.cookies.get(TRUST_COOKIE)?.value, adminId);
  if (!trusted) return null;
  return { adminId };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
