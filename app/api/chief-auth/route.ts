import { type NextRequest } from "next/server";
import { CHIEF_COOKIE, checkChiefPassword, chiefAudit, chiefCookieHeader, chiefEnabled, chiefHostOk, createChiefToken } from "../../../lib/chief";
import { getRedis } from "../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FAILS = 5;
const WINDOW = 15 * 60;

/** Chief (AI overseer) read-only login. JSON { password }. Opaque 404 when disabled or on a non-master host. */
export async function POST(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0];
  if (!chiefEnabled() || !chiefHostOk(host)) return Response.json({ error: "Not found" }, { status: 404 });
  const redis = getRedis();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  // Rate limit: per IP and global. Fails closed if Redis is unavailable.
  if (!redis) return Response.json({ error: "Unavailable" }, { status: 503 });
  const keys = [`chief:fail:ip:${ip}`, "chief:fail:all"];
  const counts = await Promise.all(keys.map((k) => redis.get<number>(k)));
  if ((counts[0] ?? 0) >= MAX_FAILS || (counts[1] ?? 0) >= MAX_FAILS * 4) {
    await chiefAudit(redis, "login_locked", { ip });
    return Response.json({ error: "Too many attempts" }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const pw = typeof body?.password === "string" ? body.password : "";
  if (!checkChiefPassword(pw)) {
    for (const k of keys) { const n = await redis.incr(k); if (n === 1) await redis.expire(k, WINDOW); }
    await chiefAudit(redis, "login_failed", { ip });
    return Response.json({ error: "Invalid" }, { status: 401 });
  }
  await chiefAudit(redis, "login_ok", { ip });
  const token = await createChiefToken();
  return new Response(JSON.stringify({ ok: true, scope: "read-only: split testing" }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": chiefCookieHeader(token, process.env.NODE_ENV === "production") },
  });
}

export async function DELETE() {
  return new Response(null, { status: 204, headers: { "Set-Cookie": `${CHIEF_COOKIE}=; Path=/; HttpOnly; Max-Age=0` } });
}
