/**
 * Lex Doc review daily caps per firm. Full admins only.
 *   GET  /api/admin/lex-review-caps?firm=tributumlaw.com.au  -> default cap, overrides, today's usage for that firm
 *   PUT  { firm, cap }   cap: whole number 0 to 500 (0 turns Doc review off), or null to use the default again
 * A firm is the users' email domain (or the full email for free-mail addresses).
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { getRedis } from "../../../../lib/redis";
import { CAPS_KEY, defaultCap, firmKeyForEmail, usageFor } from "../../../../lib/lex-review-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const s = token ? await verifySessionToken(token) : null;
  return !!s && (await isAdminSession(s.clientId));
}

const FIRM_RE = /^[a-z0-9.@_+-]{3,254}$/;
const normFirm = (v: unknown) => (typeof v === "string" ? firmKeyForEmail(v.includes("@") ? v : `x@${v}`) : "");

export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const redis = getRedis();
  const overrides = (await redis?.hgetall<Record<string, number | string>>(CAPS_KEY)) ?? {};
  const firmParam = new URL(req.url).searchParams.get("firm");
  const firm = firmParam ? normFirm(firmParam) : "";
  return Response.json({
    defaultCap: defaultCap(),
    overrides,
    ...(firm && FIRM_RE.test(firm) ? { firm, today: await usageFor(firm) } : {}),
  });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const redis = getRedis();
  if (!redis) return Response.json({ error: "Redis unavailable" }, { status: 503 });
  let body: { firm?: unknown; cap?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const firm = normFirm(body.firm);
  if (!firm || !FIRM_RE.test(firm)) return Response.json({ error: "firm must be an email domain or email" }, { status: 400 });
  if (body.cap === null) {
    await redis.hdel(CAPS_KEY, firm);
    return Response.json({ ok: true, firm, cap: defaultCap(), override: false });
  }
  const cap = typeof body.cap === "number" ? body.cap : NaN;
  if (!Number.isInteger(cap) || cap < 0 || cap > 500) return Response.json({ error: "cap must be a whole number from 0 to 500, or null" }, { status: 400 });
  await redis.hset(CAPS_KEY, { [firm]: cap });
  return Response.json({ ok: true, firm, cap, override: true });
}
