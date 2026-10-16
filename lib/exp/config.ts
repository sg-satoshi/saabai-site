import { Redis } from "@upstash/redis";
import { validateExperiment, type Experiment } from "./core";
import { SEED_EXPERIMENTS } from "./seed";

export const expKey = (siteKey: string) => `saabai:exp:${siteKey}`;
const TTL_MS = 45_000;
const cache = new Map<string, { at: number; list: Experiment[] }>();
let client: Redis | null | undefined;

function redis(): Redis | null {
  if (client !== undefined) return client;
  try { client = Redis.fromEnv(); } catch { client = null; }
  return client;
}

const seedFor = (siteKey: string) => SEED_EXPERIMENTS.filter((e) => e.siteKey === siteKey);

/** Experiments for a site. Redis wins; the built-in seed is the fail-open fallback. Never throws. */
export async function getExperiments(siteKey: string): Promise<Experiment[]> {
  const hit = cache.get(siteKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.list;
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
      if (parsed.length) list = parsed;
    }
  } catch { /* fail open to seed */ }
  cache.set(siteKey, { at: Date.now(), list });
  return list;
}

/** Writes the seed into Redis for fields that do not exist yet. Best effort, node runtime. */
export async function ensureSeeded(siteKey: string): Promise<void> {
  try {
    const r = redis();
    if (!r) return;
    for (const e of seedFor(siteKey)) await r.hsetnx(expKey(siteKey), e.id, JSON.stringify(e));
  } catch { /* ignore */ }
}

export const resetExpCache = () => cache.clear();
