import { expKey, redis } from "./config";
import { SEED_EXPERIMENTS } from "./seed";
import { variantRows } from "./mutate";
import { serviceDb } from "./track";

const registered = new Set<string>();

/**
 * Node runtime only. Makes every slot declared in seed.ts exist in Redis (what visitors see) and in Supabase
 * (the event allow-list and audit trail). Only a slot that is NOT yet in Redis is written, so live edits are never
 * overwritten. If the Supabase registration fails the Redis field is removed again so the next request retries.
 * Best effort and idempotent: it never throws and never blocks a page.
 */
export async function ensureSeeded(siteKey: string): Promise<void> {
  try {
    const r = redis();
    if (!r) return;
    for (const e of SEED_EXPERIMENTS.filter((s) => s.siteKey === siteKey)) {
      if (registered.has(e.id)) continue;
      const added = await r.hsetnx(expKey(siteKey), e.id, JSON.stringify(e));
      if (!added) { registered.add(e.id); continue; }
      const db = serviceDb();
      const { error } = db
        ? await db.rpc("exp_admin_apply", { p_key: e.id, p_site: e.siteKey, p_slot: e.slot, p_name: e.name ?? e.id, p_status: e.status, p_lead: null, p_variants: variantRows(e), p_actor: "system", p_action: "register_slot", p_detail: { slot: e.slot, kind: e.kind ?? "headline" } })
        : { error: new Error("no db") };
      if (error) { await r.hdel(expKey(siteKey), e.id); continue; }
      registered.add(e.id);
    }
  } catch { /* ignore */ }
}
