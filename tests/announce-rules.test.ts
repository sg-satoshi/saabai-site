import test from "node:test";
import assert from "node:assert/strict";
import { validateAnnouncement, pageAllowed, pathMatches, pickAnnouncement, countShown, describeRules, targetPathOf, toPublic, EMPTY_STATE, type VisitorState, type PublicAnnouncement } from "../lib/announce/core";

const base = { id: "bar-a", name: "Bar A", message: "Free AI score this week.", linkText: "Get it", linkUrl: "/ai-score" };
const mk = (o = {}, prev = null as never) => { const c = validateAnnouncement({ ...base, ...o }, prev); assert.ok(c.ok, JSON.stringify(c)); return c.ok ? c.value : (null as never); };
const pub = (o = {}) => toPublic(mk(o));
const store = (m: Record<string, Partial<VisitorState>> = {}) => (a: { id: string; version: number }): VisitorState => ({ ...EMPTY_STATE, ...(m[a.id] ?? {}) });
const ctx = (o = {}) => ({ path: "/", mobile: false, session: "s1", now: 1_000_000_000_000, state: store(), ...o });

test("defaults keep current behaviour", () => {
  const a = mk();
  assert.equal(a.afterClick, "keep"); assert.equal(a.maxShows, 0); assert.equal(a.priority, 0); assert.equal(a.pageMode, undefined);
  assert.equal(a.reshow, "days"); assert.equal(a.reshowDays, 7);
  assert.ok(pageAllowed(a, "/anything"));
  // an old stored bar (no new fields) still validates and behaves the same
  const legacy = validateAnnouncement({ ...base, include: ["/a"], exclude: ["/a/x"] }, null);
  assert.ok(legacy.ok);
  if (legacy.ok) { assert.equal(pageAllowed(legacy.value, "/a"), true); assert.equal(pageAllowed(legacy.value, "/a/x"), false); assert.equal(pageAllowed(legacy.value, "/b"), false); }
  assert.equal(pickAnnouncement([pub()], ctx())?.id, "bar-a");
});

test("pages: all, include and exclude modes", () => {
  assert.equal(pageAllowed({ pageMode: "all", include: ["/x"], exclude: ["/y"] }, "/y"), true);
  assert.equal(pageAllowed({ pageMode: "all", include: [], exclude: [] }, "/checkout"), false, "always-excluded pages stay excluded");
  const inc = { pageMode: "include" as const, include: ["/ai-score", "/blog/*"], exclude: [] };
  assert.equal(pageAllowed(inc, "/ai-score"), true); assert.equal(pageAllowed(inc, "/blog/post-1"), true); assert.equal(pageAllowed(inc, "/blog"), true); assert.equal(pageAllowed(inc, "/"), false);
  const exc = { pageMode: "exclude" as const, include: [], exclude: ["/ai-score", "/blog/*"] };
  assert.equal(pageAllowed(exc, "/"), true); assert.equal(pageAllowed(exc, "/ai-score"), false); assert.equal(pageAllowed(exc, "/ai-score/"), false); assert.equal(pageAllowed(exc, "/blog/x"), false);
  assert.equal(validateAnnouncement({ ...base, pageMode: "include", include: [] }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, pageMode: "exclude", exclude: [] }, null).ok, false);
  const m = mk({ pageMode: "include", include: ["/a"], exclude: ["/b"] });
  assert.deepEqual(m.exclude, [], "the unused list is cleared");
});
test("wildcards: trailing prefix, mid-path, query and trailing slash", () => {
  assert.equal(pathMatches("/services/*/apply", "/services/web/apply"), true);
  assert.equal(pathMatches("/services/*/apply", "/services/web/other"), false);
  assert.equal(pathMatches("/pay*", "/payments"), true);
  assert.equal(pathMatches("/ai-score", "/ai-score?x=1#top"), true);
  assert.equal(pathMatches("/a.b", "/axb"), false, "dots are literal");
  assert.equal(pathMatches("/", "/"), true);
});

test("after click: keep, hide on target page, hide everywhere", () => {
  const clicked = { "bar-a": { clickedAt: 5 } };
  const keep = pub({ afterClick: "keep" }), tgt = pub({ afterClick: "hide_target" }), all = pub({ afterClick: "hide_all" });
  assert.equal(pickAnnouncement([keep], ctx({ state: store(clicked) }))?.id, "bar-a");
  assert.equal(pickAnnouncement([tgt], ctx({ path: "/ai-score", state: store(clicked) })), null);
  assert.equal(pickAnnouncement([tgt], ctx({ path: "/", state: store(clicked) }))?.id, "bar-a");
  assert.equal(pickAnnouncement([tgt], ctx({ path: "/ai-score", state: store() }))?.id, "bar-a", "not clicked yet");
  assert.equal(pickAnnouncement([all], ctx({ path: "/", state: store(clicked) })), null);
  assert.equal(validateAnnouncement({ ...base, linkUrl: "https://example.com", afterClick: "hide_target" }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, afterClick: "bogus" as never }, null).ok, false);
  assert.equal(targetPathOf("/ai-score?a=1#x"), "/ai-score"); assert.equal(targetPathOf("tel:+61400000000"), null);
});

test("after the X: stay hidden, return after N days, return next session", () => {
  const day = 86400_000, now = 1_000_000_000_000;
  const never = pub({ reshow: "never" }), days = pub({ reshow: "days", reshowDays: 3 }), ses = pub({ reshow: "session" });
  const closed = (ago: number) => ({ "bar-a": { dismissedAt: now - ago } });
  assert.equal(pickAnnouncement([never], ctx({ state: store(closed(400 * day)) })), null);
  assert.equal(pickAnnouncement([days], ctx({ state: store(closed(2 * day)) })), null);
  assert.equal(pickAnnouncement([days], ctx({ state: store(closed(4 * day)) }))?.id, "bar-a");
  assert.equal(pickAnnouncement([ses], ctx({ state: store(closed(1000)) }))?.id, "bar-a");
});

test("frequency cap counts sessions, not page views", () => {
  const a = pub({ maxShows: 2 });
  let st: VisitorState = { ...EMPTY_STATE };
  const run = (session: string) => pickAnnouncement([a], ctx({ session, state: () => st }));
  assert.ok(run("s1")); st = countShown(st, "s1");
  assert.ok(run("s1"), "still shows on later pages in the same session"); st = countShown(st, "s1"); assert.equal(st.sessions, 1);
  assert.ok(run("s2")); st = countShown(st, "s2"); assert.equal(st.sessions, 2);
  assert.ok(run("s2"), "the session that hit the limit keeps it");
  assert.equal(run("s3"), null, "third session: stopped");
  assert.equal(validateAnnouncement({ ...base, maxShows: 51 }, null).ok, false);
  assert.equal(validateAnnouncement({ ...base, maxShows: -1 }, null).ok, false);
});

test("several bars: highest priority wins, falls through to the next", () => {
  const lo = toPublic(mk({ id: "bar-lo", priority: 1 })), hi = toPublic(mk({ id: "bar-hi", priority: 9 })), mid = toPublic(mk({ id: "bar-mid", priority: 5, pageMode: "include", include: ["/pricing"] }));
  assert.equal(pickAnnouncement([lo, hi, mid], ctx())?.id, "bar-hi");
  assert.equal(pickAnnouncement([lo, mid, hi], ctx({ state: store({ "bar-hi": { dismissedAt: 999_999_999_999 } }) }))?.id, "bar-lo");
  assert.equal(pickAnnouncement([lo, mid], ctx({ path: "/pricing" }))?.id, "bar-mid");
  assert.equal(pickAnnouncement([lo, mid], ctx({ path: "/" }))?.id, "bar-lo");
  const tie = [toPublic(mk({ id: "bar-x" })), toPublic(mk({ id: "bar-y" }))];
  assert.equal(pickAnnouncement(tie, ctx())?.id, "bar-x", "ties keep list order");
});

test("Bar A clicked hides A on the target page and Bar B scoped to it takes over", () => {
  const A = toPublic(mk({ id: "bar-a", priority: 5, afterClick: "hide_target", linkUrl: "/ai-score" }));
  const B = toPublic(mk({ id: "bar-b", priority: 5, pageMode: "include", include: ["/ai-score"], requiresClickOf: "bar-a", linkUrl: "/blueprint", message: "Thanks for looking. Ready for the Blueprint?" }));
  const list = [A, B];
  // before any click: A everywhere, B never
  assert.equal(pickAnnouncement(list, ctx({ path: "/" }))?.id, "bar-a");
  assert.equal(pickAnnouncement(list, ctx({ path: "/ai-score" }))?.id, "bar-a");
  // after clicking A: on the target B shows, elsewhere A still shows (hide_target)
  const st = store({ "bar-a": { clickedAt: 1 } });
  assert.equal(pickAnnouncement(list, ctx({ path: "/ai-score", state: st }))?.id, "bar-b");
  assert.equal(pickAnnouncement(list, ctx({ path: "/", state: st }))?.id, "bar-a");
  // hide everywhere variant
  const A2 = toPublic(mk({ id: "bar-a", priority: 5, afterClick: "hide_all", linkUrl: "/ai-score" }));
  assert.equal(pickAnnouncement([A2, B], ctx({ path: "/", state: st })), null);
  assert.equal(pickAnnouncement([A2, B], ctx({ path: "/ai-score", state: st }))?.id, "bar-b");
  // source bar gone: follow-up never shows
  assert.equal(pickAnnouncement([B], ctx({ path: "/ai-score", state: st })), null);
  assert.equal(validateAnnouncement({ ...base, requiresClickOf: "bar-a" }, null).ok, false, "cannot wait on itself");
});

test("version bumps when click or limit rules change, but not for pages or X rules", () => {
  const a = mk();
  const v = (o: object) => { const c = validateAnnouncement(o, a); assert.ok(c.ok); return c.ok ? c.value.version : 0; };
  assert.equal(v({ afterClick: "hide_all" }), 2); assert.equal(v({ maxShows: 3 }), 2);
  assert.equal(v({ priority: 4 }), 1); assert.equal(v({ pageMode: "exclude", exclude: ["/x"] }), 1); assert.equal(v({ reshow: "never" }), 1);
});

test("public payload carries rules and no admin fields; copy has no long dashes", () => {
  const p: PublicAnnouncement = toPublic(mk({ afterClick: "hide_all", maxShows: 2, priority: 3 }));
  assert.equal(p.afterClick, "hide_all"); assert.equal(p.maxShows, 2); assert.equal(p.priority, 3);
  assert.ok(!("name" in p) && !("status" in p));
  const lines = describeRules({ ...mk({ afterClick: "hide_target", maxShows: 2, requiresClickOf: undefined }), requiresClickOf: "bar-z" }, () => "Bar Z");
  assert.ok(lines.some((l) => l.includes("hidden on /ai-score only")));
  assert.ok(lines.some((l) => l.includes("at most 2 sessions")));
  assert.ok(lines.some((l) => l.includes('"Bar Z"')));
  assert.ok(lines.every((l) => !/[\u2013\u2014]/.test(l)));
});
