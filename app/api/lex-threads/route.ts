/**
 * GET  /api/lex-threads  — load threads for authenticated user from Redis
 * PUT  /api/lex-threads  — save threads for authenticated user to Redis
 *
 * Threads are stored under  lex:threads:{email}  with a 90-day TTL.
 * Auth is via the portal_session HMAC cookie (same as /api/portal/me).
 */

import { verifySession } from "../../../lib/portal-session";
import { getRedis } from "../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

function getSession(req: Request): { email: string } | null {
  const token = parseCookie(req.headers.get("cookie"), "portal_session");
  if (!token) return null;
  return verifySession(token);
}

export async function GET(req: Request) {
  const session = getSession(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const redis = getRedis();
  if (!redis) return Response.json({ threads: [] });

  try {
    const raw = await redis.get<string>(`lex:threads:${session.email}`);
    const threads = raw ? JSON.parse(raw) : [];
    return Response.json({ threads });
  } catch (err) {
    console.error("[lex-threads GET]", err);
    return Response.json({ threads: [] });
  }
}

export async function PUT(req: Request) {
  const session = getSession(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const redis = getRedis();
  if (!redis) return Response.json({ ok: false, error: "Redis unavailable" }, { status: 503 });

  try {
    const body = await req.json();
    const threads = Array.isArray(body.threads) ? body.threads : [];
    await redis.set(`lex:threads:${session.email}`, JSON.stringify(threads), { ex: TTL_SECONDS });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[lex-threads PUT]", err);
    return Response.json({ ok: false, error: "Failed to save" }, { status: 500 });
  }
}
