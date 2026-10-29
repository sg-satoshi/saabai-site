import { createHash } from "crypto";
import { getRedis } from "./redis";

/**
 * Failed-login limiter for the Wholesale sign-ins (audit H5).
 * Counts failures per account (hashed email) and per IP in a fixed window.
 * A successful login clears the account counter. Fails open if Redis is down.
 */
export const ACCOUNT_MAX_FAILS = 5;
export const IP_MAX_FAILS = 20;
export const WINDOW_SECONDS = 15 * 60;

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
}

function keys(scope: string, email: string, ip: string) {
  const e = createHash("sha256").update(String(email ?? "").trim().toLowerCase()).digest("hex");
  return { account: `loginlimit:${scope}:e:${e}`, ip: `loginlimit:${scope}:ip:${ip}` };
}

/** Returns seconds to wait if blocked, or 0 if the attempt may go ahead. */
export async function loginBlocked(scope: string, email: string, ip: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const k = keys(scope, email, ip);
  try {
    const [a, i] = await Promise.all([redis.get<number>(k.account), redis.get<number>(k.ip)]);
    const hits: string[] = [];
    if (Number(a ?? 0) >= ACCOUNT_MAX_FAILS) hits.push(k.account);
    if (Number(i ?? 0) >= IP_MAX_FAILS) hits.push(k.ip);
    if (!hits.length) return 0;
    const ttls = await Promise.all(hits.map((h) => redis.ttl(h)));
    return Math.max(1, ...ttls.map((t) => (t > 0 ? t : WINDOW_SECONDS)));
  } catch {
    return 0;
  }
}

export async function recordLoginFailure(scope: string, email: string, ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const k = keys(scope, email, ip);
  try {
    for (const key of [k.account, k.ip]) {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, WINDOW_SECONDS);
    }
  } catch {
    /* fail open */
  }
}

export async function clearLoginFailures(scope: string, email: string, ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(keys(scope, email, ip).account);
  } catch {
    /* ignore */
  }
}

export function tooManyResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: "Too many sign-in attempts. Please try again later." }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
  );
}
