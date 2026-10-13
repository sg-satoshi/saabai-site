/**
 * Brisbane (UTC+10, no DST) date helpers. Dashboard labels are computed once
 * on the server and passed to the client as props, so the server HTML and the
 * hydrated client always match (fixes React hydration error #418).
 */
export const BNE_TZ = "Australia/Brisbane";

export function brisbaneTodayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString("en-AU", { timeZone: BNE_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function brisbaneGreeting(now: Date = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-AU", { timeZone: BNE_TZ, hour: "numeric", hourCycle: "h23" }).format(now));
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
