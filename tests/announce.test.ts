import test from "node:test";
import assert from "node:assert/strict";
import { validateAnnouncement, pageAllowed, pathMatches, isLiveNow, safeUrl, contrast, THEMES, isOwnedSite, isDismissed, toPublic, announcementValue, isEmptyValue } from "../lib/announce/core";
import { buildTest } from "../lib/announce/test";
import { validateExperiment, assign } from "../lib/exp/core";

const base = { id: "oct-offer", name: "Oct offer", message: "Free AI score this week.", linkText: "Get it", linkUrl: "/ai-score" };
const mk = (o = {}) => { const c = validateAnnouncement({ ...base, ...o }, null); assert.ok(c.ok, JSON.stringify(c)); return c.ok ? c.value : (null as never); };

test("defaults to draft and owned sites only", () => {
  assert.equal(mk().status, "draft");
  assert.equal(validateAnnouncement({ ...base, siteKey: "stus" }, null).ok, false);
  assert.equal(isOwnedSite("stus"), false);
});
test("validation: dashes, length, links, card needs trigger", () => {
  assert.equal(validateAnnouncement({ ...base, message: "a \u2014 b" }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, message: "x".repeat(121) }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, linkUrl: "javascript:alert(1)" }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, linkText: "" }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, layout: "card", title: "T", status: "live", delaySec: 0, scrollPct: 0 }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, layout: "card", title: "T", status: "live" }, null).ok, true);
});
test("version bumps on content change only", () => {
  const a = mk();
  const same = validateAnnouncement({ status: "live" }, a); assert.ok(same.ok && same.value.version === 1);
  const chg = validateAnnouncement({ message: "New copy." }, a); assert.ok(chg.ok && chg.value.version === 2);
});
test("brand themes pass AA", () => { for (const t of Object.values(THEMES)) assert.ok(contrast(t.fg, t.bg) >= 4.5); });
test("urls", () => { assert.ok(safeUrl("/book")); assert.ok(safeUrl("tel:+61400000000")); assert.ok(!safeUrl("//evil.com")); assert.ok(!safeUrl("data:text/html,x")); });
test("page rules and default excludes", () => {
  const a = mk();
  assert.ok(pageAllowed(a, "/"));
  for (const p of ["/checkout", "/checkout/x", "/admin", "/saabai-admin/experiments", "/privacy", "/terms", "/unsubscribe", "/blueprint/pay"]) assert.equal(pageAllowed(a, p), false, p);
  assert.equal(pageAllowed(mk({ exclude: ["/blog/*"] }), "/blog/post"), false);
  assert.equal(pageAllowed(mk({ include: ["/pricing"] }), "/"), false);
  assert.ok(pathMatches("/blog/*", "/blog"));
});
test("schedule", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  assert.equal(isLiveNow({ status: "draft" }, now), false);
  assert.equal(isLiveNow({ status: "live" }, now), true);
  assert.equal(isLiveNow({ status: "live", startsAt: "2026-10-21T00:00:00Z" }, now), false);
  assert.equal(isLiveNow({ status: "live", endsAt: "2026-10-19T00:00:00Z" }, now), false);
  assert.equal(isLiveNow({ status: "scheduled" }, now), false);
});
test("dismissal", () => {
  assert.equal(isDismissed({ reshow: "never", reshowDays: 7 }, 1), true);
  assert.equal(isDismissed({ reshow: "days", reshowDays: 7 }, Date.now() - 8 * 86400_000), false);
  assert.equal(isDismissed({ reshow: "days", reshowDays: 7 }, Date.now() - 86400_000), true);
  assert.equal(isDismissed({ reshow: "days", reshowDays: 7 }, null), false);
});
test("public payload has no admin fields", () => { const p = toPublic(mk()) as Record<string, unknown>; assert.equal(p.name, undefined); assert.equal(p.testId, undefined); });
test("split test is a DRAFT, valid, announcement slot, empty control for bar vs none", () => {
  const e = buildTest(mk(), "bar_vs_none", "call_click");
  assert.ok(!("error" in e));
  if ("error" in e) return;
  assert.equal(e.status, "draft"); assert.equal(e.slotType, "announcement");
  assert.ok(validateExperiment(e));
  assert.deepEqual(Object.keys(e.variants[0].value ?? {}).sort(), ["goal"]);
  assert.equal(e.variants[1].value?.message, "Free AI score this week.");
  assert.equal(isEmptyValue({}), true); assert.ok(Object.keys(announcementValue(mk())).length > 3);
});
test("A vs B needs exactly one change", () => {
  assert.ok("error" in buildTest(mk(), "ab", "form_submit", { layout: "bottom", message: "Other" }));
  assert.ok(!("error" in buildTest(mk(), "ab", "form_submit", { layout: "bottom" })));
});
test("draft experiments never assign", () => {
  const e = buildTest(mk(), "bar_vs_none", "call_click"); if ("error" in e) throw new Error("x");
  const r = assign(e, { ua: "Mozilla/5.0 (Macintosh) Chrome/120 Safari/537", privacy: false, admin: false, optedOut: false, cookie: null, newVisitorId: () => "x" });
  assert.equal(r.track, false);
});
