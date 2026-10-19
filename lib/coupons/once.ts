/**
 * One use per customer. Stripe has no per-customer limit, so we keep our own record.
 *
 * Privacy: we never store an email. The key is HMAC-SHA256(secret, normalised email), truncated,
 * so the stored value can't be reversed by guessing common addresses without our server secret.
 * The value is just { at, sessionId } (an opaque Stripe id). Nothing here is shown in admin.
 * Fails OPEN (allows) if Redis or the secret is missing, so a storage problem never breaks checkout.
 */
import { createHmac } from "node:crypto";
import { getRedis } from "../redis";
import { normaliseEmail, onceKey } from "./core";

export interface OnceStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, opts?: { nx?: boolean }): Promise<unknown>;
}

const secret = () => process.env.SAABAI_SESSION_SECRET?.trim() || "";

/** Stable hash of a customer's email for this feature. Null if the email or secret is missing. */
export function hashCustomer(email: unknown, key = secret()): string | null {
  const e = normaliseEmail(email);
  if (!e || !key) return null;
  return createHmac("sha256", key).update(`coupon-once:${e}`).digest("hex").slice(0, 32);
}

function resolveStore(store?: OnceStore): OnceStore | null {
  if (store) return store;
  return getRedis() as unknown as OnceStore | null;
}

/** Has this customer already used this promotion code? False (allow) when we can't tell. */
export async function hasUsed(promotionCodeId: string, email: unknown, store?: OnceStore, key?: string): Promise<boolean> {
  const h = hashCustomer(email, key);
  const st = resolveStore(store);
  if (!h || !st || !promotionCodeId) return false;
  try {
    return (await st.get(onceKey(promotionCodeId, h))) != null;
  } catch (e) {
    console.error("[coupon once] lookup failed, allowing", e instanceof Error ? e.message : e);
    return false;
  }
}

export type MarkResult = "new" | "same" | "repeat" | "skipped";

/**
 * Record a use. "new" first time; "same" the same session retried (webhook retries are no-ops);
 * "repeat" a different session already used it (flag for review); "skipped" nothing recorded.
 */
export async function markUsed(promotionCodeId: string, email: unknown, sessionId: string, store?: OnceStore, key?: string): Promise<MarkResult> {
  const h = hashCustomer(email, key);
  const st = resolveStore(store);
  if (!h || !st || !promotionCodeId) return "skipped";
  const k = onceKey(promotionCodeId, h);
  try {
    const ok = await st.set(k, { at: new Date().toISOString(), sessionId }, { nx: true });
    if (ok) return "new";
    const cur = (await st.get(k)) as { sessionId?: string } | null;
    return cur?.sessionId === sessionId ? "same" : "repeat";
  } catch (e) {
    console.error("[coupon once] record failed", e instanceof Error ? e.message : e);
    return "skipped";
  }
}
