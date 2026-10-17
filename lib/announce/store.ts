import { redis } from "@/lib/exp/config";
import { validateAll, validateAnnouncement, isOwnedSite, isLiveNow, settle, type Announcement, type Input, type FieldErrors } from "./core";

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
      if (c.ok) out.push(settle({ ...c.value, version: o.version ?? 1, createdAt: o.createdAt, updatedAt: o.updatedAt, ...(o.testId ? { testId: o.testId } : {}) }));
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

export type SaveResult = { ok: true; value: Announcement } | { ok: false; error: string; status: number; fields?: FieldErrors };
export async function saveAnnouncement(site: string, input: Input): Promise<SaveResult> {
  if (!isOwnedSite(site)) return { ok: false, error: "Announcements are only available on Saabai-owned sites.", status: 403, fields: { form: "Announcements are only available on Saabai-owned sites." } };
  const all = await listAnnouncements(site);
  const prev = input.id ? all.find((x) => x.id === input.id) ?? null : null;
  const c = validateAll({ ...input, siteKey: site }, prev);
  const fields: FieldErrors = c.ok ? {} : { ...c.fields };
  if (!prev && c.ok && all.some((x) => x.id === c.value.id)) fields.id = "That id is already used. Pick a different one.";
  if (!c.ok || Object.keys(fields).length) {
    // One live announcement per site at a time (one announcement per page view). Checked here too so it is reported alongside the other faults.
    const st = (input.status ?? prev?.status) as string | undefined;
    const idv = (prev?.id ?? String(input.id ?? "")).toLowerCase();
    const other = all.find((x) => x.id !== idv && (x.status === "live" || x.status === "scheduled"));
    if (!c.ok && (st === "live" || st === "scheduled") && other && !fields.status) fields.status = `"${other.name}" is already live or scheduled. End it first (one announcement at a time).`;
    const n = Object.keys(fields).length;
    return { ok: false, error: n === 1 ? Object.values(fields)[0] : `${n} things need fixing before this can be saved.`, status: fields.id && n === 1 ? 409 : 400, fields };
  }
  if (c.value.status === "live" || c.value.status === "scheduled") {
    const other = all.find((x) => x.id !== c.value.id && (x.status === "live" || x.status === "scheduled"));
    if (other) { const m = `"${other.name}" is already live or scheduled. End it first (one announcement at a time).`; return { ok: false, error: m, status: 409, fields: { status: m } }; }
  }
  try { await writeAnnouncement(c.value); } catch { return { ok: false, error: "Couldn't save (Redis unavailable). Nothing was changed. Try again.", status: 502, fields: { form: "Couldn't save (Redis unavailable). Nothing was changed. Try again." } }; }
  return { ok: true, value: c.value };
}

/** The one announcement that may show now, or null. */
export async function liveAnnouncement(site: string, now = new Date()): Promise<Announcement | null> {
  if (!(await announcementsEnabled(site))) return null;
  return (await listAnnouncements(site)).find((a) => isLiveNow(a, now)) ?? null;
}
