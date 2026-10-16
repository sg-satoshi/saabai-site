import { expKey, redis } from "./config";
import { validateExperiment } from "./core";
import { SEED_EXPERIMENTS } from "./seed";
import { variantRows } from "./mutate";
import { serviceDb } from "./track";

const registered = new Set<string>();

/**
 * Node runtime only. Makes every slot declared in seed.ts exist in Redis (what visitors see) and in Supabase
 * (the event allow-list and audit trail). Redis is only written when the slot is missing, and Supabase only when it has no
 * variants yet, so live edits are never overwritten. If registration fails a Redis field we just added is removed so the next request retries.
 * Best effort and idempotent: it never throws and never blocks a page.
 */
export async function ensureSeeded(siteKey: string): Promise<void> {
  try {
    const r = redis();
    if (!r) return;
    const db = serviceDb();
    for (const seed of SEED_EXPERIMENTS.filter((x) => x.siteKey === siteKey)) {
      if (registered.has(seed.id)) continue;
      const added = await r.hsetnx(expKey(siteKey), seed.id, JSON.stringify(seed));
      // Use what is live in Redis (it may have been edited) when registering, else the seed.
      let e = seed;
      if (!added) {
        try {
          const raw = await r.hget<unknown>(expKey(siteKey), seed.id);
          const live = validateExperiment(typeof raw === "string" ? JSON.parse(raw) : raw);
          if (live) e = live;
        } catch { /* use seed */ }
      }
      if (!db) { if (added) await r.hdel(expKey(siteKey), seed.id); continue; }
      // Is it already in Supabase? (A previous run may have written Redis and been frozen before this step.)
      const have = await db.rpc("exp_stats", { p_experiment: e.id });
      if (have.error) { if (added) await r.hdel(expKey(siteKey), seed.id); continue; }
      if ((have.data ?? []).length === 0) {
        const { error } = await db.rpc("exp_admin_apply", { p_key: e.id, p_site: e.siteKey, p_slot: e.slot, p_name: e.name ?? e.id, p_status: e.status, p_lead: e.leadValueAUD ?? null, p_variants: variantRows(e), p_actor: "system", p_action: "register_slot", p_detail: { slot: e.slot, kind: e.kind ?? "headline" } });
        if (error) { if (added) await r.hdel(expKey(siteKey), seed.id); continue; }
      }
      registered.add(seed.id);
    }
  } catch { /* ignore */ }
}
