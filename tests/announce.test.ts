import test from "node:test";
import assert from "node:assert/strict";
import { shadowCss, isShadow, normHex, normColors, bestText, resolveTheme, checkColors, isThemeKey, validateAnnouncement, pageAllowed, pathMatches, isLiveNow, safeUrl, contrast, THEMES, isOwnedSite, isDismissed, toPublic, announcementValue, isEmptyValue, normTimer, timerParts, timerUnits, timerOver, timerExpired, timerColors, timerValue, timerFromValue, settle, brisbaneText, TIMER_STYLES } from "../lib/announce/core";
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

// ---- countdown timer ----
const NOW = new Date("2026-10-20T00:00:00Z");
const END = "2026-10-25T07:00:00.000Z";
const tm = (o = {}) => ({ style: "boxed", endAt: END, endMode: "hide", ...o });
const mkT = (o = {}, t: object | null = tm()) => { const c = validateAnnouncement({ ...base, ...o, timer: t } as never, null, NOW); assert.ok(c.ok, JSON.stringify(c)); return c.ok ? c.value : (null as never); };
test("timer: fixed deadline stored as UTC ISO, all four styles valid, unknown style rejected", () => {
  for (const s of TIMER_STYLES) assert.equal(mkT({}, tm({ style: s })).timer?.style, s);
  assert.equal(mkT({}, tm({ endAt: "2026-10-25T17:00:00+10:00" })).timer?.endAt, "2026-10-25T07:00:00.000Z");
  assert.equal(validateAnnouncement({ ...base, timer: tm({ style: "spin" }) } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endAt: "soon" }) } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endMode: "explode" }) } as never, null, NOW).ok, false);
  assert.equal(mkT().timer?.endMode, "hide");
});
test("timer: no evergreen or per-visitor timers exist (only an absolute deadline is accepted)", () => {
  assert.equal(validateAnnouncement({ ...base, timer: { style: "text", durationMin: 30, endMode: "hide" } } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, timer: { style: "text", endAt: "30", endMode: "hide" } } as never, null, NOW).ok, false);
  const pub = JSON.stringify(toPublic(mkT(), undefined, NOW.getTime()));
  assert.ok(!/duration|evergreen|reset|perVisitor/i.test(pub));
});
test("timer: past or too-far dates rejected when going Live or Scheduled, allowed on drafts", () => {
  const past = tm({ endAt: "2026-10-19T00:00:00Z" });
  assert.equal(validateAnnouncement({ ...base, status: "live", timer: past } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, status: "scheduled", startsAt: "2026-10-19T00:00:00Z", timer: past } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, status: "draft", timer: past } as never, null, NOW).ok, true);
  assert.equal(validateAnnouncement({ ...base, status: "live", timer: tm() } as never, null, NOW).ok, true);
  assert.equal(validateAnnouncement({ ...base, status: "live", timer: tm({ endAt: "2028-10-25T00:00:00Z" }) } as never, null, NOW).ok, false);
  // a draft with a past deadline cannot be flipped Live
  const draft = mkT({}, past);
  assert.equal(validateAnnouncement({ status: "live" } as never, draft, NOW).ok, false);
});
test("timer: editing an already live announcement past its deadline (message mode) is allowed, re-arming is not", () => {
  const live = mkT({ status: "live" }, tm({ endMode: "message", endMessage: "Offer ended." }));
  const later = new Date("2026-10-26T00:00:00Z");
  const edit = validateAnnouncement({ message: "Tweaked copy." }, live, later);
  assert.ok(edit.ok);
  const ended = { ...live, status: "ended" as const };
  assert.equal(validateAnnouncement({ status: "live" }, ended, later).ok, false);
});
test("timer: timer null removes it, undefined keeps it", () => {
  const a = mkT();
  const keep = validateAnnouncement({ message: "New." }, a, NOW); assert.ok(keep.ok && keep.value.timer?.endAt === END);
  const drop = validateAnnouncement({ timer: null } as never, a, NOW); assert.ok(drop.ok && drop.value.timer === undefined);
});
test("timer: end state options validated (hide, message, optional link, auto end)", () => {
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endMode: "message" }) } as never, null, NOW).ok, false, "message required");
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endMode: "message", endMessage: "x".repeat(121) }) } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endMode: "message", endMessage: "Over. Join the waitlist.", endLinkText: "Join" }) } as never, null, NOW).ok, false, "text without url");
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endMode: "message", endMessage: "Over.", endLinkText: "Join", endLinkUrl: "javascript:alert(1)" }) } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endMode: "message", endMessage: "Over \u2014 sorry." }) } as never, null, NOW).ok, false, "no long dashes");
  const nb = mkT({}, tm({ endMode: "message", endMessage: "Offer ended.", endLinkText: "", endLinkUrl: "" })).timer!;
  assert.equal(nb.endLinkText, undefined);
  const wl = mkT({}, tm({ endMode: "message", endMessage: "Offer ended.", endLinkText: "Waitlist", endLinkUrl: "/waitlist", autoEnd: true, endShowHours: 48 })).timer!;
  assert.deepEqual([wl.endLinkText, wl.endLinkUrl, wl.autoEnd, wl.endShowHours], ["Waitlist", "/waitlist", true, 48]);
  assert.equal(validateAnnouncement({ ...base, timer: tm({ endMode: "message", endMessage: "x", autoEnd: true, endShowHours: 0 }) } as never, null, NOW).ok, false);
  const hide = mkT({}, tm({ endMode: "hide", endMessage: "ignored", autoEnd: true })).timer!;
  assert.equal(hide.endMessage, undefined); assert.equal(hide.autoEnd, undefined);
  assert.equal(normTimer(tm({ endMode: "message", endMessage: "c".repeat(140) }), "card").ok, true);
});
test("timer: announcement end must not precede the timer, start must precede it", () => {
  assert.equal(validateAnnouncement({ ...base, endsAt: "2026-10-24T00:00:00Z", timer: tm() } as never, null, NOW).ok, false);
  assert.equal(validateAnnouncement({ ...base, endsAt: "2026-10-26T00:00:00Z", timer: tm() } as never, null, NOW).ok, true);
  assert.equal(validateAnnouncement({ ...base, startsAt: "2026-10-26T00:00:00Z", timer: tm() } as never, null, NOW).ok, false);
});
test("timer parts, units and days hidden at zero", () => {
  assert.deepEqual(timerParts((2 * 86400 + 4 * 3600 + 15 * 60 + 9) * 1000), { d: 2, h: 4, m: 15, s: 9 });
  assert.deepEqual(timerParts(-5000), { d: 0, h: 0, m: 0, s: 0 });
  assert.deepEqual(timerUnits(((2 * 86400) + 3661) * 1000).map((u) => u.value), ["02", "01", "01", "01"]);
  assert.deepEqual(timerUnits(3661_000).map((u) => u.key), ["h", "m", "s"]);
  assert.deepEqual(timerUnits(59_999).map((u) => u.value), ["00", "00", "59"]);
  assert.equal(brisbaneText("2026-10-25T07:00:00Z"), "Sun 25 Oct, 5:00 pm");
});
test("timer: expiry, hide mode and auto-end drive liveness and derived status (server side)", () => {
  const endMs = Date.parse(END);
  const hide = mkT({ status: "live" }, tm()), msg = mkT({ status: "live" }, tm({ endMode: "message", endMessage: "Done." })), auto = mkT({ status: "live" }, tm({ endMode: "message", endMessage: "Done.", autoEnd: true, endShowHours: 2 }));
  assert.equal(isLiveNow(hide, new Date(endMs - 1)), true);
  assert.equal(isLiveNow(hide, new Date(endMs)), false);
  assert.equal(isLiveNow(msg, new Date(endMs + 86400_000 * 5)), true);
  assert.equal(isLiveNow(auto, new Date(endMs + 3600_000)), true);
  assert.equal(isLiveNow(auto, new Date(endMs + 2 * 3600_000)), false);
  assert.equal(settle(hide, new Date(endMs + 1)).status, "ended");
  assert.equal(settle(msg, new Date(endMs + 1)).status, "live");
  assert.equal(settle(auto, new Date(endMs + 3 * 3600_000)).status, "ended");
  assert.equal(timerOver(undefined, 0), false); assert.equal(timerExpired({ endAt: END }, endMs), true);
});
test("timer: public payload carries server time and the server's expired decision; end state swaps the message", () => {
  const a = mkT({ status: "live", linkText: "Get it", linkUrl: "/ai-score" }, tm({ endMode: "message", endMessage: "Offer ended.", endLinkText: "Waitlist", endLinkUrl: "/waitlist" }));
  const before = toPublic(a, undefined, Date.parse(END) - 1000);
  assert.equal(before.timer?.expired, false); assert.equal(before.timer?.serverNow, Date.parse(END) - 1000);
  assert.equal(before.message, "Free AI score this week."); assert.equal(before.linkText, "Get it");
  assert.equal(before.timer?.endMessage, "Offer ended.");
  const after = toPublic(a, undefined, Date.parse(END) + 1000);
  assert.equal(after.timer?.expired, true); assert.equal(after.message, "Offer ended."); assert.equal(after.linkText, "Waitlist"); assert.equal(after.linkUrl, "/waitlist");
  const noBtn = toPublic(mkT({ status: "live" }, tm({ endMode: "message", endMessage: "Offer ended." })), undefined, Date.parse(END) + 1);
  assert.equal(noBtn.linkText, ""); assert.equal(noBtn.linkUrl, "");
  assert.equal(toPublic(mk()).timer, undefined);
  assert.equal(toPublic(mkT()).message, "Free AI score this week.");
});
test("timer colours: digit boxes keep the theme's text contrast (AA) for every preset and custom colours", () => {
  for (const [k, t] of Object.entries(THEMES)) {
    const c = timerColors(t);
    assert.ok(contrast(c.digit, c.box) >= 4.5, k + " digits on box");
    assert.ok(contrast(c.text, t.bg) >= 4.5, k + " text line and pill");
  }
  const custom = resolveTheme("custom", { bg: "#ef4444", fg: "#ffffff", cta: "#ffffff", close: "#ffffff" });
  const c = timerColors(custom);
  assert.equal(contrast(c.digit, c.box).toFixed(3), contrast(custom.fg, custom.bg).toFixed(3));
});
test("timer in split test variants: round trip, fits 300 chars, inherits or removes", () => {
  const t = tm({ style: "flip", endMode: "message", endMessage: "m".repeat(120), endLinkText: "Join the waitlist now", endLinkUrl: "https://saabai.ai/waitlist", autoEnd: true, endShowHours: 24 });
  const a = mkT({ status: "live", message: "x".repeat(120) }, t);
  const v = announcementValue(a);
  for (const val of Object.values(v)) assert.ok(val.length <= 300);
  assert.deepEqual(timerFromValue(v, undefined, "top"), a.timer);
  assert.deepEqual(timerFromValue({ message: "hi" }, a.timer, "top"), a.timer, "no timer keys inherits");
  assert.equal(timerFromValue({ tStyle: "none" }, a.timer, "top"), undefined);
  assert.equal(timerFromValue({ tStyle: "boxed", tEnd: "garbage", tMode: "hide" }, a.timer, "top"), undefined, "bad variant timer never guesses a deadline");
  assert.equal(announcementValue(mk()).tStyle, "none");
  assert.equal(timerValue(undefined).tStyle, "none");
  const e = buildTest(a, "bar_vs_none", "call_click"); assert.ok(!("error" in e)); if (!("error" in e)) { assert.ok(validateExperiment(e)); assert.equal(e.variants[1].value?.tEnd, a.timer?.endAt); }
});
test("timer: version bumps when the deadline or end message changes", () => {
  const a = mkT({ status: "live" });
  const same = validateAnnouncement({ timer: tm({ style: "pill" }) } as never, a, NOW); assert.ok(same.ok && same.value.version === a.version);
  const moved = validateAnnouncement({ timer: tm({ endAt: "2026-10-26T07:00:00Z" }) } as never, a, NOW); assert.ok(moved.ok && moved.value.version === a.version + 1);
});
