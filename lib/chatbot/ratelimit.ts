/**
 * Minute-bucket rate limits for public chatbot beacons. Same pattern as lib/exp/track.ts
 * rateLimited: the IP is hashed (never stored raw), buckets expire after 90 seconds, and
 * the check fails open so a Redis outage never breaks a visitor's chat.
 */
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";

/** Per visitor IP, per bot. A real visitor fires a handful of events per minute at most. */
export const EVENT_LIMIT_PER_IP = 30;
/** Per bot across all visitors. Caps a distributed flood against one client's funnel counts. */
export const EVENT_LIMIT_PER_BOT = 600;

export function ipHash(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return createHash("sha256").update(ip + (process.env.SAABAI_SESSION_SECRET ?? "")).digest("hex").slice(0, 16);
}

export function eventRateKeys(slug: string, ipH: string, now = Date.now()): { ip: string; bot: string } {
  const m = Math.floor(now / 60000);
  return { ip: `saabai:chat:rl:ev:ip:${slug}:${ipH}:${m}`, bot: `saabai:chat:rl:ev:bot:${slug}:${m}` };
}

type Counter = { incr(k: string): Promise<number>; expire(k: string, s: number): Promise<unknown> };

/** True when the event should be dropped. Fails open. */
export async function eventRateLimited(req: Request, slug: string, redis?: Counter, now = Date.now()): Promise<boolean> {
  try {
    const r: Counter = redis ?? (Redis.fromEnv() as unknown as Counter);
    const k = eventRateKeys(slug, ipHash(req), now);
    const ip = await r.incr(k.ip);
    if (ip === 1) await r.expire(k.ip, 90);
    if (ip > EVENT_LIMIT_PER_IP) return true;
    const bot = await r.incr(k.bot);
    if (bot === 1) await r.expire(k.bot, 90);
    return bot > EVENT_LIMIT_PER_BOT;
  } catch {
    return false;
  }
}
