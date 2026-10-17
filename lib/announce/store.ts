import { redis } from "@/lib/exp/config";
import { validateAnnouncement, isOwnedSite, isLiveNow, type Announcement, type Input } from "./core";

const key = (site: string) => `saabai:announce:${site}`;
const flagKey = (site: string) => `saabai:announce:flag:${site}`;

/** Site flag `announcements_enabled`. Default false. Env ANNOUNCEMENTS_KILL=1 forces off. Only owned sites can ever be on. */
export async function announcementsEnabled(site: string): Promise<boolean> {
  try {
    if (!isOwnedSite(site) || process.env.ANNOUNCEMENTS_KILL === "1") return false;
    const r = redis();
    if (!r) return false;
    const v = await r.get<unknown>(flagKey(site));
    return v === true || v === "1" || v === 1 || v === "true";
  } catch { return false; }
}
export async function setAnnouncementsEnabled(site: string, on: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isOwnedSite(site)) return { ok: false, error: "Announcements can only be enabled on Saabai-owned sites." };
  const r = redis();
  if (!r) return { ok: false, error: "Redis is not configured." };
  await r.set(flagKey(site), on ? "1" : "0");
  return { ok: true };
}

export async function listAnnouncements(site: string): Promise<Announcement[]> {
  try {
    const r = redis();
    if (!r || !isOwnedSite(site)) return [];
    const raw = await r.hgetall<Record<string, unknown>>(key(site));
    const out: Announcement[] = [];
    for (const v of Object.values(raw ?? {})) {
      const o = (typeof v === "string" ? JSON.parse(v) : v) as Announcement;
      const c = validateAnnouncement(o, null, new Date(o.createdAt ?? Date.now()));
      if (c.ok) out.push({ ...c.value, version: o.version ?? 1, createdAt: o.createdAt, updatedAt: o.updatedAt, ...(o.testId ? { testId: o.testId } : {}) });
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch { return []; }
}
export async function writeAnnouncement(a: Announcement): Promise<void> {
  const r = redis();
  if (!r) throw new Error("Redis is not configured");
  await r.hset(key(a.siteKey), { [a.id]: JSON.stringify(a) });
}
export async function deleteAnnouncement(site: string, id: string): Promise<void> { await redis()?.hdel(key(site), id); }

export async function saveAnnouncement(site: string, input: Input): Promise<{ ok: true; value: Announcement } | { ok: false; error: string; status: number }> {
  if (!isOwnedSite(site)) return { ok: false, error: "Announcements are only available on Saabai-owned sites.", status: 403 };
  const all = await listAnnouncements(site);
  const prev = input.id ? all.find((x) => x.id === input.id) ?? null : null;
  const c = validateAnnouncement({ ...input, siteKey: site }, prev);
  if (!c.ok) return { ok: false, error: c.error, status: 400 };
  if (!prev && all.some((x) => x.id === c.value.id)) return { ok: false, error: "That id is already used.", status: 409 };
  // One live announcement per site at a time (one announcement per page view).
  if (c.value.status === "live" || c.value.status === "scheduled") {
    const other = all.find((x) => x.id !== c.value.id && (x.status === "live" || x.status === "scheduled"));
    if (other) return { ok: false, error: `"${other.name}" is already live or scheduled. End it first (one announcement at a time).`, status: 409 };
  }
  try { await writeAnnouncement(c.value); } catch { return { ok: false, error: "Couldn't save (Redis unavailable).", status: 502 }; }
  return { ok: true, value: c.value };
}

/** The one announcement that may show now, or null. */
export async function liveAnnouncement(site: string, now = new Date()): Promise<Announcement | null> {
  if (!(await announcementsEnabled(site))) return null;
  return (await listAnnouncements(site)).find((a) => isLiveNow(a, now)) ?? null;
}
