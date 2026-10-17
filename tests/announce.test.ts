import test from "node:test";
import assert from "node:assert/strict";
import { shadowCss, isShadow, normHex, normColors, bestText, resolveTheme, checkColors, isThemeKey, validateAnnouncement, pageAllowed, pathMatches, isLiveNow, safeUrl, contrast, THEMES, isOwnedSite, isDismissed, toPublic, announcementValue, isEmptyValue } from "../lib/announce/core";
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
test("every preset theme passes AA for text and 3:1 for button and icon", () => {
  for (const [k, t] of Object.entries(THEMES)) {
    assert.ok(contrast(t.fg, t.bg) >= 4.5, k + " text");
    assert.ok(contrast(t.ctaFg, t.cta) >= 4.5, k + " button text");
    assert.ok(contrast(t.cta, t.bg) >= 3, k + " button");
    assert.ok(contrast(t.close, t.bg) >= 3, k + " close");
    assert.ok(checkColors(t).every((c) => c.level === "ok"), k);
  }
  for (const k of ["alert_red", "warning", "success", "high_contrast", "yellow_on_dark", "surface", "navy", "teal"]) assert.ok(isThemeKey(k));
  assert.equal(mk({ theme: "alert_red" }).theme, "alert_red");
});
test("hex validation is strict (no CSS injection)", () => {
  assert.equal(normHex("#FFF"), "#ffffff");
  assert.equal(normHex(" #DC2626 "), "#dc2626");
  for (const bad of ["red", "#12", "#12345", "#1234567", "#ggg", "url(x)", "#fff;background:url(//x)", "#fff} body{display:none", "rgb(1,2,3)", "", null, 5]) assert.equal(normHex(bad as never), null, String(bad));
  assert.equal(normColors({ bg: "#000", fg: "#fff", cta: "#fff", close: "#fff" })?.bg, "#000000");
  assert.equal(normColors({ bg: "#000", fg: "#fff", cta: "#fff" }), null);
});
test("custom theme: needs valid hex, normalises, blocks under 3:1, drops colours for presets", () => {
  const ok = mk({ theme: "custom", colors: { bg: "#DC2626", fg: "#FFF", cta: "#fff", close: "#fff" } });
  assert.deepEqual(ok.colors, { bg: "#dc2626", fg: "#ffffff", cta: "#ffffff", close: "#ffffff" });
  assert.equal(validateAnnouncement({ ...base, theme: "custom" }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, theme: "custom", colors: { bg: "red", fg: "#fff", cta: "#fff", close: "#fff" } }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, theme: "custom", colors: { bg: "#fff;x", fg: "#fff", cta: "#000", close: "#000" } }, null).ok, false);
  const low = validateAnnouncement({ ...base, theme: "custom", colors: { bg: "#ffff00", fg: "#ffffff", cta: "#000000", close: "#000000" } }, null);
  assert.ok(!low.ok && /contrast/.test(low.error));
  assert.equal(validateAnnouncement({ ...base, theme: "custom", colors: { bg: "#000000", fg: "#ffffff", cta: "#111111", close: "#ffffff" } }, null).ok, false, "button too close to background");
  assert.equal(validateAnnouncement({ ...base, theme: "nope" as never }, null).ok, false);
  assert.equal(mk({ theme: "warning", colors: { bg: "#000", fg: "#fff", cta: "#fff", close: "#fff" } }).colors, undefined);
});
test("contrast warnings between 3 and 4.5, with a black/white suggestion", () => {
  const t = resolveTheme("custom", { bg: "#ef4444", fg: "#ffffff", cta: "#ffffff", close: "#ffffff" });
  const fg = checkColors(t).find((c) => c.key === "fg")!;
  assert.ok(fg.ratio >= 3 && fg.ratio < 4.5 && fg.level === "warn" && fg.suggest === "#000000");
  assert.equal(bestText("#000000"), "#ffffff"); assert.equal(bestText("#ffff00"), "#000000");
  assert.equal(validateAnnouncement({ ...base, theme: "custom", colors: { bg: "#ef4444", fg: "#ffffff", cta: "#ffffff", close: "#ffffff" } }, null).ok, true, "warned, not blocked");
});
test("custom colours reach the public payload and test variants; unknown themes fall back", () => {
  const a = mk({ theme: "custom", colors: { bg: "#7f1d1d", fg: "#fde047", cta: "#fde047", close: "#fde047" } });
  assert.equal(toPublic(a).colors?.bg, "#7f1d1d");
  assert.equal(announcementValue(a).cBg, "#7f1d1d");
  assert.equal(toPublic(mk()).colors, undefined);
  assert.equal(resolveTheme("bogus").bg, THEMES.surface.bg);
  assert.equal(resolveTheme("custom", { bg: "x" }).bg, THEMES.surface.bg);
});
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
test("drop shadow: none/soft/strong, optional validated colour, all layouts", () => {
  assert.equal(mk().shadow, "none");
  assert.equal(mk({ layout: "card", title: "T" }).shadow, "soft", "card keeps its default soft shadow");
  for (const l of ["top", "bottom", "card"]) {
    assert.equal(shadowCss(l, "none"), "none");
    assert.match(shadowCss(l, "soft"), /^0 -?\d+px 14px rgba\(0,0,0,0\.25\)$/);
    assert.match(shadowCss(l, "strong", "#FF0000"), /rgba\(255,0,0,0\.55\)$/);
  }
  assert.match(shadowCss("top", "soft"), /^0 4px/); assert.match(shadowCss("bottom", "soft"), /^0 -4px/);
  assert.equal(shadowCss("top", "weird"), "none");
  assert.match(shadowCss("top", "soft", "red;x"), /rgba\(0,0,0/);
  assert.equal(validateAnnouncement({ ...base, shadow: "huge" as never }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, shadow: "soft", shadowColor: "#000;background:url(x)" }, null).ok, false);
  assert.equal(mk({ shadow: "strong", shadowColor: "#F00" }).shadowColor, "#ff0000");
  assert.equal(mk({ shadow: "strong", shadowColor: "" }).shadowColor, undefined);
  const a = mk({ shadow: "soft", shadowColor: "#112233" });
  assert.equal(toPublic(a).shadow, "soft"); assert.equal(toPublic(a).shadowColor, "#112233"); assert.equal(announcementValue(a).shadow, "soft");
  assert.ok(isShadow("soft") && !isShadow("x"));
});
