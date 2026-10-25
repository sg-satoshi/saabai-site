/**
 * Coupon start / end instants.
 *
 * Everything we store is an absolute instant (unix seconds, UTC): Stripe's
 * `expires_at` (redeem_by) and our own `starts_at` metadata. The admin enters a
 * date and optional time in their own timezone; the browser converts that to an
 * instant before sending. Legacy date-only strings (YYYY-MM-DD) are still accepted
 * and mean Brisbane start / end of day, exactly as before.
 */

export const SITE_TZ = "Australia/Brisbane";

type Parts = { y: number; mo: number; d: number; h: number; mi: number; s: number };

function offsetMinutes(ms: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = parseInt(x.value, 10);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/**
 * Wall-clock date + time in `tz` -> unix seconds. `date` is YYYY-MM-DD, `time` is HH:mm
 * (or HH:mm:ss). Null if either is malformed. In a DST gap (clock skips forward) the
 * time resolves forward; in an overlap (clock repeats) the earlier instant is used.
 */
export function zonedToUnix(date: string, time: string, tz: string): number | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dm || !tm) return null;
  const q: Parts = { y: +dm[1], mo: +dm[2], d: +dm[3], h: +tm[1], mi: +tm[2], s: tm[3] ? +tm[3] : 0 };
  if (q.mo < 1 || q.mo > 12 || q.d < 1 || q.d > 31 || q.h > 23 || q.mi > 59 || q.s > 59) return null;
  const wall = Date.UTC(q.y, q.mo - 1, q.d, q.h, q.mi, q.s);
  if (new Date(wall).getUTCDate() !== q.d) return null; // e.g. 31 Feb
  try {
    // Try both offsets around the wall time; keep the earliest that round-trips, else resolve forward.
    const o1 = offsetMinutes(wall - 24 * 3600e3, tz);
    const o2 = offsetMinutes(wall + 24 * 3600e3, tz);
    const cands = [...new Set([o1, o2])].map((o) => wall - o * 60000).filter((ms) => offsetMinutes(ms, tz) * 60000 === wall - ms);
    if (cands.length) return Math.floor(Math.min(...cands) / 1000);
    return Math.floor((wall - Math.min(o1, o2) * 60000) / 1000); // gap: the clock skipped this time
  } catch {
    return null; // unknown timezone
  }
}

/** Date/time as an ISO instant for the API: blank time defaults to 00:00 (start) or 23:59:59 (end). */
export function localInputToIso(date: string, time: string, kind: "start" | "end", tz: string): string {
  if (!date) return "";
  const t = time ? (kind === "end" && time.length === 5 ? `${time}:59` : time) : kind === "start" ? "00:00:00" : "23:59:59";
  const unix = zonedToUnix(date, t, tz);
  return unix == null ? date : new Date(unix * 1000).toISOString(); // fall back to raw so the server rejects it clearly
}

/**
 * Parse a start/end value from a request: unix seconds (number), an ISO instant with
 * Z or an offset, or a legacy YYYY-MM-DD (Brisbane start or end of that day). Null if invalid.
 */
export function parseInstant(v: unknown, kind: "start" | "end"): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.floor(v) : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return zonedToUnix(s, kind === "start" ? "00:00:00" : "23:59:59", SITE_TZ);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) {
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  }
  return null;
}

/** "12 Nov 2026, 9:30 am AEST". `tz` undefined = the viewer's own timezone. */
export function formatInstant(unix: number, tz?: string): string {
  return new Date(unix * 1000).toLocaleString("en-AU", { timeZone: tz, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

/** Short zone label for an instant, e.g. "AEST". */
export function zoneAbbr(unix: number, tz?: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(unix * 1000)).find((p) => p.type === "timeZoneName")?.value ?? "";
}
