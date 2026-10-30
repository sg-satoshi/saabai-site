/**
 * GET  /api/lex-threads  — load threads for authenticated user from Redis
 * PUT  /api/lex-threads  — save threads for authenticated user to Redis
 *
 * Threads are stored under  lex:threads:{email}  with a 90-day TTL.
 * Chat attachment text is masked before it is stored (thread-stable placeholders), so no readable
 * client details from an uploaded document are kept at rest.
 * Auth: the portal_session cookie, or a Lex firm user signed in through /login.
 */

import { verifySession } from "../../../lib/portal-session";
import { getRedis } from "../../../lib/redis";
import { parseRedisJson } from "../../../lib/redis-json";
import { resolveReviewActor } from "../../../lib/lex-review-access";
import { maskThreadAttachments } from "../../../lib/lex-privacy/thread-attachments";
import { lexFirmFromRequest } from "../../../lib/lex-privacy/firm";
import { matterPartiesFor } from "../../../lib/lex-privacy/matter-parties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

/** Portal session, or a Lex firm user signed in through /login (same per-user key either way). */
async function getSession(req: Request): Promise<{ email: string } | null> {
  const token = parseCookie(req.headers.get("cookie"), "portal_session");
  const portal = token ? verifySession(token) : null;
  if (portal?.email) return portal;
  const actor = await resolveReviewActor(req).catch(() => null);
  return actor?.kind === "firm" ? { email: actor.email } : null;
}

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const redis = getRedis();
  if (!redis) return Response.json({ threads: [] });

  try {
    const raw = await redis.get(`lex:threads:${session.email}`);
    const parsed = parseRedisJson<unknown>(raw);
    const threads = Array.isArray(parsed) ? parsed : [];
    return Response.json({ threads });
  } catch (err) {
    console.error("[lex-threads GET]", err);
    return Response.json({ threads: [] });
  }
}

export async function PUT(req: Request) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const redis = getRedis();
  if (!redis) return Response.json({ ok: false, error: "Redis unavailable" }, { status: 503 });

  try {
    const body = await req.json();
    const raw = Array.isArray(body.threads) ? body.threads : [];
    const { threads } = await maskThreadAttachments(raw, lexFirmFromRequest(req, "lex-internal"), (matterId) => matterPartiesFor(req, matterId));
    await redis.set(`lex:threads:${session.email}`, JSON.stringify(threads), { ex: TTL_SECONDS });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[lex-threads PUT]", err);
    return Response.json({ ok: false, error: "Failed to save" }, { status: 500 });
  }
}
