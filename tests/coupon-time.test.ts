import { test } from "node:test";
import assert from "node:assert/strict";
import { formatInstant, localInputToIso, parseInstant, zonedToUnix, zoneAbbr } from "../lib/coupons/time";
import { brisbaneEndOfDay, brisbaneStartOfDay, notStartedMessage, parseCouponInput } from "../lib/coupons/core";

const iso = (u: number | null) => (u == null ? null : new Date(u * 1000).toISOString());
const D = 86400e3;
const day = (ahead: number) => new Date(Date.now() + ahead * D).toISOString().slice(0, 10);

test("instant conversion: same wall time, different zones", () => {
  assert.equal(iso(zonedToUnix("2026-11-12", "09:30", "Australia/Brisbane")), "2026-11-11T23:30:00.000Z");
  assert.equal(iso(zonedToUnix("2026-11-12", "09:30", "Australia/Sydney")), "2026-11-11T22:30:00.000Z"); // AEDT +11
  assert.equal(iso(zonedToUnix("2026-11-12", "09:30", "America/Los_Angeles")), "2026-11-12T17:30:00.000Z"); // PST -8
  assert.equal(iso(zonedToUnix("2026-11-12", "09:30", "UTC")), "2026-11-12T09:30:00.000Z");
  assert.equal(iso(zonedToUnix("2026-11-12", "09:30", "Asia/Kolkata")), "2026-11-12T04:00:00.000Z"); // half-hour zone
});

test("instant conversion: rejects malformed input", () => {
  assert.equal(zonedToUnix("2026-02-31", "10:00", "UTC"), null);
  assert.equal(zonedToUnix("2026-11-12", "25:00", "UTC"), null);
  assert.equal(zonedToUnix("12/11/2026", "10:00", "UTC"), null);
  assert.equal(zonedToUnix("2026-11-12", "10:00", "Not/AZone"), null);
});

test("DST edges: gap resolves forward, overlap takes the earlier instant, offsets differ either side", () => {
  // Sydney springs forward 4 Oct 2026 at 2:00 -> 3:00. 02:30 doesn't exist.
  assert.equal(iso(zonedToUnix("2026-10-04", "01:59", "Australia/Sydney")), "2026-10-03T15:59:00.000Z"); // +10
  assert.equal(iso(zonedToUnix("2026-10-04", "03:00", "Australia/Sydney")), "2026-10-03T16:00:00.000Z"); // +11
  assert.equal(iso(zonedToUnix("2026-10-04", "02:30", "Australia/Sydney")), "2026-10-03T16:30:00.000Z"); // resolves forward to 03:30 local
  // New York falls back 1 Nov 2026 at 2:00 -> 1:00. 01:30 happens twice; earlier (EDT) wins.
  assert.equal(iso(zonedToUnix("2026-11-01", "01:30", "America/New_York")), "2026-11-01T05:30:00.000Z");
  assert.equal(iso(zonedToUnix("2026-11-01", "03:00", "America/New_York")), "2026-11-01T08:00:00.000Z"); // EST
  // A start and end on opposite sides of a change: duration is real elapsed time.
  const a = zonedToUnix("2026-10-03", "23:59", "Australia/Sydney")!, b = zonedToUnix("2026-10-04", "03:01", "Australia/Sydney")!;
  assert.equal((b - a) / 60, 122); // 3h02 on the wall clock minus the skipped hour
  // Brisbane never changes.
  assert.equal(iso(zonedToUnix("2026-10-04", "12:00", "Australia/Brisbane")), "2026-10-04T02:00:00.000Z");
});

test("blank time defaults: start 00:00, end 23:59:59, matching the legacy date-only behaviour", () => {
  assert.equal(localInputToIso("2026-11-12", "", "start", "Australia/Brisbane"), new Date(brisbaneStartOfDay("2026-11-12")! * 1000).toISOString());
  assert.equal(localInputToIso("2026-11-12", "", "end", "Australia/Brisbane"), new Date(brisbaneEndOfDay("2026-11-12")! * 1000).toISOString());
  assert.equal(localInputToIso("2026-11-12", "17:45", "end", "Australia/Brisbane"), "2026-11-12T07:45:59.000Z");
  assert.equal(localInputToIso("2026-11-12", "17:45", "start", "Australia/Brisbane"), "2026-11-12T07:45:00.000Z");
  assert.equal(localInputToIso("", "17:45", "start", "UTC"), "");
});

test("legacy date-only values still parse as Brisbane start / end of day", () => {
  assert.equal(parseInstant("2026-11-12", "start"), brisbaneStartOfDay("2026-11-12"));
  assert.equal(parseInstant("2026-11-12", "end"), brisbaneEndOfDay("2026-11-12"));
  assert.equal(parseInstant("2026-11-12T09:30:00+10:00", "start"), Date.parse("2026-11-12T09:30:00+10:00") / 1000);
  assert.equal(parseInstant("2026-11-12T09:30:00.000Z", "end"), Date.parse("2026-11-12T09:30:00Z") / 1000);
  assert.equal(parseInstant(1800000000, "end"), 1800000000);
  for (const bad of ["soon", "2026-11-12T09:30", "12/11/2026", "", null, undefined, -5, NaN]) assert.equal(parseInstant(bad, "start"), null);
});

test("parseCouponInput: exact instants with times stored for start and end", () => {
  const s = new Date(Date.now() + 3 * D).toISOString(), e = new Date(Date.now() + 5 * D).toISOString();
  const i = parseCouponInput({ code: "TIMED", kind: "percent", value: 10, startsAt: s, expiresAt: e });
  assert.ok(typeof i !== "string");
  if (typeof i !== "string") {
    assert.equal(i.startsAt, Math.floor(Date.parse(s) / 1000));
    assert.equal(i.expiresAt, Math.floor(Date.parse(e) / 1000));
  }
});

test("validation: end after start, end in the future, start not far in the past", () => {
  const at = (days: number) => new Date(Date.now() + days * D).toISOString();
  const base = { code: "TIMED", kind: "percent", value: 10 };
  assert.equal(parseCouponInput({ ...base, startsAt: at(5), expiresAt: at(3) }), "Start date must be before the expiry date");
  assert.equal(parseCouponInput({ ...base, startsAt: at(5), expiresAt: at(5) }), "Start date must be before the expiry date"); // equal
  assert.equal(typeof parseCouponInput({ ...base, startsAt: at(5), expiresAt: new Date(Date.parse(at(5)) + 60e3).toISOString() }), "object"); // one minute later is fine
  assert.equal(parseCouponInput({ ...base, expiresAt: at(-0.01) }), "Expiry must be in the future");
  assert.equal(parseCouponInput({ ...base, expiresAt: day(-2) }), "Expiry must be in the future"); // legacy date-only, past
  assert.equal(parseCouponInput({ ...base, startsAt: at(-3) }), "Start date can't be in the past");
  const now = parseCouponInput({ ...base, startsAt: at(-0.01) }); // slightly past = starts now, no schedule
  assert.ok(typeof now !== "string" && now.startsAt === undefined);
  assert.equal(parseCouponInput({ ...base, expiresAt: "garbage" }), "Expiry date isn't valid");
});

test("labels carry date, time and zone abbreviation; start message is in Brisbane time", () => {
  const t = Date.parse("2026-11-12T09:30:00+10:00") / 1000;
  assert.match(formatInstant(t, "Australia/Brisbane"), /12 Nov 2026.*9:30\s?am.*AEST/i);
  assert.equal(zoneAbbr(t, "Australia/Brisbane"), "AEST");
  const msg = notStartedMessage("LAUNCH", t, (t - 60) * 1000)!;
  assert.match(msg, /isn't active yet\. It starts on 12 Nov 2026, 9:30\s?am AEST \(Brisbane time\)\./i);
  assert.equal(notStartedMessage("LAUNCH", t, t * 1000), null); // exact instant: live at the second
});
