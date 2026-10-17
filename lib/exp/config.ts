import { Redis } from "@upstash/redis";
import { validateExperiment, type Experiment } from "./core";
import { SEED_EXPERIMENTS } from "./seed";

export const expKey = (siteKey: string) => `saabai:exp:${siteKey}`;
const TTL_MS = 45_000;
const cache = new Map<string, { at: number; list: Experiment[] }>();
let client: Redis | null | undefined;

export function redis(): Redis | null {
  if (client !== undefined) return client;
  try { client = Redis.fromEnv(); } catch { client = null; }
  return client;
}

const seedFor = (siteKey: string) => SEED_EXPERIMENTS.filter((e) => e.siteKey === siteKey);

/** Experiments for a site. Redis wins; the built-in seed is the fail-open fallback. Never throws. */
export async function getExperiments(siteKey: string, opts: { fresh?: boolean } = {}): Promise<Experiment[]> {
  const hit = cache.get(siteKey);
  if (!opts.fresh && hit && Date.now() - hit.at < TTL_MS) return hit.list;
  let list = seedFor(siteKey);
  try {
    const r = redis();
    if (r) {
      const raw = await r.hgetall<Record<string, unknown>>(expKey(siteKey));
      const parsed: Experiment[] = [];
      for (const v of Object.values(raw ?? {})) {
        const o = typeof v === "string" ? JSON.parse(v) : v;
        const ok = validateExperiment(o);
        if (ok) parsed.push(ok);
      }
      // Redis wins per experiment. Slots declared in code but not yet in Redis are served from the seed.
      if (parsed.length) list = [...parsed, ...seedFor(siteKey).filter((s) => !parsed.some((p) => p.id === s.id))];
    }
  } catch { /* fail open to seed */ }
  cache.set(siteKey, { at: Date.now(), list });
  return list;
}

export const resetExpCache = () => cache.clear();

/** Dashboard write: stores one experiment (already validated) in Redis. Throws if Redis is unavailable. */
export async function writeExperiment(e: Experiment): Promise<void> {
  const r = redis();
  if (!r) throw new Error("Redis is not configured");
  await r.hset(expKey(e.siteKey), { [e.id]: JSON.stringify(e) });
  cache.delete(e.siteKey);
}

/** Status of the background wrap PR for an overlay test. Kept in its own hash so it can never race a dashboard edit. */
export type WrapInfo = NonNullable<Experiment["wrapPr"]>;
const wrapKey = (siteKey: string) => `saabai:exp:wrap:${siteKey}`;
export async function getWrapInfos(siteKey: string): Promise<Record<string, WrapInfo>> {
  try {
    const r = redis(); if (!r) return {};
    const raw = await r.hgetall<Record<string, unknown>>(wrapKey(siteKey));
    const out: Record<string, WrapInfo> = {};
    for (const [k, v] of Object.entries(raw ?? {})) { const o = typeof v === "string" ? JSON.parse(v) : v; if (o && typeof o === "object") out[k] = o as WrapInfo; }
    return out;
  } catch { return {}; }
}
export async function setWrapInfo(siteKey: string, id: string, info: WrapInfo): Promise<void> {
  try { await redis()?.hset(wrapKey(siteKey), { [id]: JSON.stringify(info) }); } catch { /* display only */ }
}
