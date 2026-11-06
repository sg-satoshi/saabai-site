/**
 * Series quiet hours for Australia/Brisbane (UTC+10, no daylight saving).
 * No sends from 9pm inclusive until 7am. 7:00am is a valid send time.
 * Keep this in step with email_after_quiet() in db/migrations/009_email_marketing.sql.
 */
const OFFSET_MS = 10 * 60 * 60 * 1000;
const QUIET_FROM = 21;
const QUIET_UNTIL = 7;

export function brisbaneParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const local = new Date(date.getTime() + OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

/** 07:00 Australia/Brisbane on a calendar day. Date.UTC normalises month overflow. */
export function brisbaneAt(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 10, minute, 0));
}

/** Push a timestamp out of quiet hours. Times already inside 7am–9pm are unchanged. */
export function afterQuiet(date: Date): Date {
  const p = brisbaneParts(date);
  if (p.hour >= QUIET_UNTIL && p.hour < QUIET_FROM) return date;
  const extraDay = p.hour >= QUIET_FROM ? 1 : 0;
  return brisbaneAt(p.year, p.month, p.day + extraDay, QUIET_UNTIL, 0);
}

export function isQuiet(date: Date): boolean {
  const h = brisbaneParts(date).hour;
  return h >= QUIET_FROM || h < QUIET_UNTIL;
}

/** When a series step should run: the later of (enrolled + delay) and now, then quiet hours. */
export function seriesRunAt(enrolledAt: Date, delayMinutes: number, now: Date): Date {
  const target = new Date(enrolledAt.getTime() + delayMinutes * 60_000);
  const due = target.getTime() < now.getTime() ? now : target;
  return afterQuiet(due);
}
