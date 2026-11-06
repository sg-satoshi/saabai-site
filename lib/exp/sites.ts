import { redis } from "./config";
import { siteKeyForHost } from "./core";
import { slugForHost } from "../client-site-surface";

/**
 * Which sites split testing runs on. saabai.ai follows EXPERIMENTS_ENABLED_SITES exactly as before (default on).
 * Every Site Factory client site is OFF by default: it only runs when Shane switches it on in the dashboard
 * (Redis flag) or names it in EXPERIMENTS_ENABLED_SITES. "none" in the env list switches every site off.
 */
export const SAABAI_SITE = "saabai";
export const SITE_KEY_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const SITE_FLAGS_KEY = "saabai:exp:site-on";
const TTL_MS = 45_000;
let flagCache: { at: number; on: Set<string> } | null = null;

const envList = (env: string | undefined) => (env === undefined ? [SAABAI_SITE] : env.split(",").map((s) => s.trim()).filter(Boolean));

/** Pure: is this site on, given the env list and the stored flags? Client sites default to off. */
export function siteOn(siteKey: string, env: string | undefined, flags: Set<string>): boolean {
  const list = envList(env);
  if (list.includes("none")) return false;
  if (siteKey === SAABAI_SITE) return list.includes(SAABAI_SITE);
  if (!SITE_KEY_RE.test(siteKey)) return false;
  return list.includes(siteKey) || flags.has(siteKey);
}

async function storedFlags(fresh = false): Promise<Set<string>> {
  if (!fresh && flagCache && Date.now() - flagCache.at < TTL_MS) return flagCache.on;
  const on = new Set<string>();
  try {
    // Short timeout: a hung Redis read must never stall a page. Timeout means off (fail closed).
    const raw = await Promise.race([redis()?.hgetall<Record<string, unknown>>(SITE_FLAGS_KEY), new Promise<null>((r) => setTimeout(() => r(null), 400))]);
    for (const [k, v] of Object.entries(raw ?? {})) if (String(v) === "1") on.add(k);
  } catch { /* fail closed for client sites: no flag means off */ }
  flagCache = { at: Date.now(), on };
  return on;
}

/** Never throws. Client sites fail closed (off) when Redis is unreachable. */
export async function isSiteEnabled(siteKey: string, opts: { fresh?: boolean } = {}): Promise<boolean> {
  if (siteKey === SAABAI_SITE) return siteOn(siteKey, process.env.EXPERIMENTS_ENABLED_SITES, new Set());
  return siteOn(siteKey, process.env.EXPERIMENTS_ENABLED_SITES, await storedFlags(opts.fresh));
}

/** Dashboard switch for a client site. saabai.ai is controlled by env only. Throws if Redis is unavailable. */
export async function setSiteEnabled(siteKey: string, on: boolean): Promise<void> {
  if (siteKey === SAABAI_SITE || !SITE_KEY_RE.test(siteKey)) throw new Error("Not a client site");
  const r = redis();
  if (!r) throw new Error("Redis is not configured");
  if (on) await r.hset(SITE_FLAGS_KEY, { [siteKey]: "1" });
  else await r.hdel(SITE_FLAGS_KEY, siteKey);
  flagCache = null;
}

/**
 * Experiment ids are global (Supabase key, cookie, events), so a client site's slot names always start with its
 * site key ("sunder-home.hero.headline", still three parts for SLOT_RE). Two sites can never share a test id.
 */
export function scopedSlot(siteKey: string, slot: string): string {
  if (siteKey === SAABAI_SITE) return slot;
  return slot.startsWith(`${siteKey}-`) ? slot : `${siteKey}-${slot}`;
}

/**
 * Site key for the host a request arrived on: "saabai" for saabai.ai and previews, the client slug for a custom
 * domain (coded map first, then the Site Factory domain map in Redis), else null. Never throws.
 */
export async function siteKeyForRequestHost(hostname: string): Promise<string | null> {
  const own = siteKeyForHost(hostname);
  if (own) return own;
  const h = hostname.toLowerCase().split(":")[0];
  const coded = slugForHost(h);
  if (coded) return coded;
  try {
    const slug = await redis()?.hget<string>("saabai:domain-map", h.replace(/^www\./, ""));
    return typeof slug === "string" && SITE_KEY_RE.test(slug) ? slug : null;
  } catch { return null; }
}
