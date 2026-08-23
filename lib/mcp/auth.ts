/**
 * Auth gate for the Saabai MCP endpoint.
 *
 * Primary path (MCP clients, incl. Hermes native MCP): static Bearer token
 * (`Authorization: Bearer ${MCP_API_KEY}`), matching the CRON_SECRET bearer
 * pattern already used in this codebase. Compared with timingSafeEqual.
 *
 * Secondary path (Shane in a browser): the existing admin session cookie
 * (`saabai_session`) + clientId === SAABAI_ADMIN_ID.
 *
 * Fail-closed: if MCP_API_KEY is not configured in production, refuse to serve
 * (503) rather than silently exposing data. Local dev falls back to cookie-only.
 */
import { timingSafeEqual } from "node:crypto";
import { verifySessionToken, COOKIE_NAME } from "../auth";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export interface AuthResult {
  ok: boolean;
  status: number;
  message?: string;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf-8");
  const bb = Buffer.from(b, "utf-8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function cookieValue(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const s = part.trim();
    if (s.startsWith(name + "=")) return decodeURIComponent(s.slice(name.length + 1));
  }
  return null;
}

async function authorizeByCookie(req: Request): Promise<AuthResult> {
  const token = cookieValue(req, COOKIE_NAME);
  if (!token) return { ok: false, status: 401, message: "Unauthorized" };
  try {
    const session = await verifySessionToken(token);
    if (session && session.clientId === ADMIN_ID) return { ok: true, status: 200 };
  } catch {
    /* fall through to 401 */
  }
  return { ok: false, status: 401, message: "Unauthorized" };
}

export async function authorizeRequest(req: Request): Promise<AuthResult> {
  const key = process.env.MCP_API_KEY;
  const isProd = process.env.VERCEL_ENV === "production";

  // Fail-closed: key must be configured in production.
  if (!key) {
    if (isProd) {
      return { ok: false, status: 503, message: "MCP_API_KEY not configured" };
    }
    return authorizeByCookie(req);
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token && safeEqual(token, key)) return { ok: true, status: 200 };
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  // Allow the admin cookie as a secondary gate (browser curl) even when key is set.
  return authorizeByCookie(req);
}
