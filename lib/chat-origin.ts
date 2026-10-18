import { Redis } from "@upstash/redis";

/**
 * Origin allow-list and per-site limits for the public Site Factory chat.
 *
 * Modes (env CHAT_ORIGIN_MODE): "log" (default, records would-be blocks, blocks
 * nothing), "enforce" (rejects), "off". Everything else in the security fix is
 * always on; only the origin check has a rollout switch so a missed client
 * domain cannot take a live chatbot down.
 */

export type OriginMode = "off" | "log" | "enforce";
export const originMode = (): OriginMode => {
  const v = (process.env.CHAT_ORIGIN_MODE || "log").toLowerCase();
  return v === "enforce" || v === "off" ? v : "log";
};

const MASTER_HOSTS = ["saabai.ai", "www.saabai.ai"];

const bare = (h: string) => h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");

/** Host of the page that is calling, from Origin, else Referer. Null if neither is usable. */
export function callerHost(origin: string | null | undefined, referer?: string | null): string | null {
  for (const v of [origin, referer]) {
    if (!v || v === "null") continue;
    try {
      return new URL(v).hostname.toLowerCase();
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Hosts allowed to talk to one site's bot: Saabai itself, the site's own domains, mapped domains. */
export function allowedHosts(siteDomains: string[] | undefined, mappedHosts: string[] = [], dev = false): Set<string> {
  const set = new Set<string>(MASTER_HOSTS);
  for (const d of [...(siteDomains ?? []), ...mappedHosts]) {
    const b = bare(d);
    if (!b) continue;
    set.add(b);
    set.add(b.startsWith("www.") ? b.slice(4) : `www.${b}`);
  }
  if (dev) {
    set.add("localhost");
    set.add("127.0.0.1");
  }
  return set;
}

export function hostAllowed(host: string | null, allowed: Set<string>): boolean {
  return !!host && allowed.has(host);
}

let redisClient: Redis | null = null;
const r = () => (redisClient ??= Redis.fromEnv());

let mapCache: { at: number; map: Record<string, string> } | null = null;
async function domainMap(): Promise<Record<string, string>> {
  if (mapCache && Date.now() - mapCache.at < 60_000) return mapCache.map;
  try {
    const m = (await r().hgetall<Record<string, string>>("saabai:domain-map")) ?? {};
    mapCache = { at: Date.now(), map: m };
    return m;
  } catch {
    return mapCache?.map ?? {};
  }
}

export async function mappedHostsFor(slug: string): Promise<string[]> {
  const m = await domainMap();
  return Object.entries(m).filter(([, s]) => s === slug).map(([h]) => h);
}

/** Record a would-be block so Shane can check the list before switching to enforce. */
export async function logOriginMiss(slug: string, host: string | null): Promise<void> {
  try {
    await r().hincrby("saabai:chat:origin-misses", `${slug}|${host ?? "none"}`, 1);
  } catch {
    /* logging only */
  }
}

const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);
export const SLUG_MINUTE_LIMIT = () => num(process.env.CHAT_SLUG_MIN_LIMIT, 60);
export const SLUG_DAY_LIMIT = () => num(process.env.CHAT_SLUG_DAY_LIMIT, 2000);

/** Per-site message limits (fails open if Redis is down). Returns a reason or null. */
export async function slugLimited(slug: string): Promise<"minute" | "day" | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const mk = `chat-slug:min:${slug}:${Math.floor(now / 60)}`;
    const dk = `chat-slug:day:${slug}:${new Date().toISOString().slice(0, 10)}`;
    const p = r().pipeline();
    p.incr(mk);
    p.expire(mk, 120);
    p.incr(dk);
    p.expire(dk, 26 * 3600);
    const [m, , d] = (await p.exec()) as [number, unknown, number, unknown];
    if (d > SLUG_DAY_LIMIT()) return "day";
    if (m > SLUG_MINUTE_LIMIT()) return "minute";
  } catch (e) {
    console.error("chat slug limit check failed (allowing):", e);
  }
  return null;
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Keep only plain user/assistant turns, capped in count and length. Never trusts roles like "system". */
export function cleanMessages(input: unknown, maxMsgs = 12, maxChars = 2000): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(input)) return [];
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const c = content.trim().slice(0, maxChars);
    if (c) out.push({ role, content: c });
  }
  const last = out.slice(-maxMsgs);
  while (last.length && last[0].role !== "user") last.shift();
  return last;
}
