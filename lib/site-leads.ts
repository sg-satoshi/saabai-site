/**
 * Read the lead list a Site Factory site has captured (newest first, max 100).
 * The Upstash client already JSON-decodes list items, so items may arrive as
 * objects or (older writes) strings; handle both and skip anything corrupt.
 */
import { Redis } from "@upstash/redis";

const WHOLESALE_LEADS_KEY = "saabai:leads:wholesale-homes";

export async function listSiteLeads(siteSlug: string): Promise<Record<string, unknown>[]> {
  const redis = Redis.fromEnv();
  const raw = await redis.lrange<unknown>(`saabai:leads:${siteSlug}`, 0, 99);
  return parseLeadItems(raw);
}

function parseLeadItems(raw: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const item of raw) {
    const v = parseLead(item);
    if (v) out.push(v);
  }
  return out;
}

function parseLead(item: unknown): Record<string, unknown> | null {
  let v: unknown = item;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { return null; }
  }
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** email|createdAt. Email is trimmed and lowercased. */
export function wholesaleRegistrationId(email: string, createdAt: number): string {
  return `${email.trim().toLowerCase()}|${createdAt}`;
}

function registrationId(item: unknown): string | null {
  const lead = parseLead(item);
  if (!lead) return null;
  const email = typeof lead.email === "string" ? lead.email : "";
  const createdAt = typeof lead.createdAt === "number"
    ? lead.createdAt
    : typeof lead.createdAt === "string" && lead.createdAt.trim() !== ""
      ? Number(lead.createdAt)
      : NaN;
  if (!email.trim() || !Number.isFinite(createdAt)) return null;
  return wholesaleRegistrationId(email, createdAt);
}

/** The exact list element Redis stored, so LREM can match it. */
function storedValue(item: unknown): string {
  return typeof item === "string" ? item : JSON.stringify(item);
}

/**
 * Hard-delete pending Wholesale Homes registrations.
 *
 * A registration is one JSON value in the Redis list saabai:leads:wholesale-homes.
 * Signup does not write a directory user, a password token, or a SQL row, so
 * removing that list value leaves nothing behind. Approved portal accounts in
 * saabai:users are separate and are not touched.
 *
 * Returns how many list values were removed.
 */
export async function deleteWholesaleRegistrations(
  targets: { email: string; createdAt: number }[],
): Promise<number> {
  if (targets.length === 0) return 0;
  const redis = Redis.fromEnv();
  const want = new Set(targets.map((t) => wholesaleRegistrationId(t.email, t.createdAt)));
  const raw = (await redis.lrange<unknown>(WHOLESALE_LEADS_KEY, 0, -1)) ?? [];
  const removeValues = new Set<string>();
  for (const item of raw) {
    const id = registrationId(item);
    if (id && want.has(id)) removeValues.add(storedValue(item));
  }
  if (removeValues.size === 0) return 0;

  let deleted = 0;
  let missed = false;
  for (const value of removeValues) {
    const n = await redis.lrem(WHOLESALE_LEADS_KEY, 0, value);
    const count = typeof n === "number" ? n : 0;
    if (count === 0) missed = true;
    else deleted += count;
  }
  if (!missed) return deleted;

  // The re-serialized value did not match the bytes Redis has. Rewrite the
  // list without the selected registrations and keep every other entry.
  const again = (await redis.lrange<unknown>(WHOLESALE_LEADS_KEY, 0, -1)) ?? [];
  const keep: string[] = [];
  let removed = 0;
  for (const item of again) {
    const id = registrationId(item);
    if (id && want.has(id)) {
      removed++;
      continue;
    }
    keep.push(storedValue(item));
  }
  if (removed === 0) return deleted;
  await redis.del(WHOLESALE_LEADS_KEY);
  for (const value of keep) await redis.rpush(WHOLESALE_LEADS_KEY, value);
  return deleted + removed;
}
