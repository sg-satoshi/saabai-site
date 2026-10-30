/** Lex Firm plan document allowance (billing cycle).   npx tsx --test tests/lex-doc-allowance.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { takeDocument, docUsage, brisbaneMonth, resolveDocPeriod, requestFingerprint, monthlyDocCounts, docLimitMessage, FIRM_PLAN_MONTHLY_DOCS, DOC_WARN_AT, DOC_CAPS_KEY, type DocPeriod } from "../lib/lex-doc-allowance";
import { resetDateLabel } from "../lib/lex-doc-allowance-shared";
import { docState } from "../app/lex/_components/DocAllowance";

function fakeStore(opts: { fail?: boolean } = {}) {
  const kv = new Map<string, string>(); const sets = new Map<string, Set<string>>(); const hashes = new Map<string, Map<string, string>>();
  const guard = () => { if (opts.fail) throw new Error("ECONNREFUSED"); };
  const s = {
    kv, hashes,
    async set(k: string, v: string, o?: { nx?: boolean }) { guard(); if (o?.nx && kv.has(k)) return null; kv.set(k, v); return "OK"; },
    async get(k: string) { guard(); return kv.get(k) ?? null; },
    async incr(k: string) { guard(); const n = Number(kv.get(k) ?? 0) + 1; kv.set(k, String(n)); return n; },
    async incrby(k: string, by: number) { guard(); const n = Number(kv.get(k) ?? 0) + by; kv.set(k, String(n)); return n; },
    async expire() { guard(); return 1; },
    async del(k: string) { guard(); return kv.delete(k) ? 1 : 0; },
    async sadd(k: string, m: string) { guard(); if (!sets.has(k)) sets.set(k, new Set()); sets.get(k)!.add(m); return 1; },
    async smembers(k: string) { guard(); return [...(sets.get(k) ?? [])]; },
    async hget(k: string, f: string) { guard(); return hashes.get(k)?.get(f) ?? null; },
  };
  return s as unknown as Parameters<typeof takeDocument>[2] & typeof s;
}
const NOW = new Date("2026-10-30T03:00:00Z");
const quiet = () => {};
const PAID = { firmId: "lf_abc", periodStart: "2026-10-12T04:00:00.000Z", periodEnd: "2026-11-12T04:00:00.000Z" };
const billing = () => resolveDocPeriod(PAID, "firm.com.au", NOW, quiet);

test("paying firm: period is the Stripe billing cycle, keyed by firm id and period start", () => {
  const p = billing();
  assert.equal(p.basis, "billing");
  assert.equal(p.scope, "firm:lf_abc:2026-10-12T04:00:00.000Z");
  assert.equal(p.end, PAID.periodEnd);
  assert.equal(resetDateLabel(p.end), "12 November 2026");
  // Next cycle (after the renewal webhook updates the record) is a fresh counter.
  const next = resolveDocPeriod({ ...PAID, periodStart: PAID.periodEnd, periodEnd: "2026-12-12T04:00:00.000Z" }, "firm.com.au", new Date("2026-11-13T00:00:00Z"), quiet);
  assert.notEqual(next.scope, p.scope);
});

test("firm with only periodEnd uses periodEnd minus one month as the start", () => {
  const p = resolveDocPeriod({ firmId: "lf_x", periodEnd: "2026-11-12T04:00:00.000Z" }, "x.com", NOW, quiet);
  assert.equal(p.basis, "billing"); assert.equal(p.start, "2026-10-12T04:00:00.000Z");
});

test("trial firm: 30-day windows from trial start, capped at trial end", () => {
  const f = { firmId: "lf_t", trialStartedAt: "2026-09-01T00:00:00.000Z", trialEndsAt: "2026-10-31T00:00:00.000Z" };
  const a = resolveDocPeriod(f, "t.com", new Date("2026-09-15T00:00:00Z"), quiet);
  assert.equal(a.basis, "trial"); assert.equal(a.start, "2026-09-01T00:00:00.000Z"); assert.equal(a.end, "2026-10-01T00:00:00.000Z");
  const b = resolveDocPeriod(f, "t.com", NOW, quiet);
  assert.equal(b.start, "2026-10-01T00:00:00.000Z"); assert.equal(b.end, "2026-10-31T00:00:00.000Z");
  // Trial converted to paid: billing period wins after the trial ends.
  const c = resolveDocPeriod({ ...f, periodStart: "2026-10-31T00:00:00.000Z", periodEnd: "2026-11-30T00:00:00.000Z" }, "t.com", new Date("2026-11-02T00:00:00Z"), quiet);
  assert.equal(c.basis, "billing");
});

test("no firm record or no current period: domain plus Brisbane calendar month, logged", () => {
  const logs: string[] = [];
  const a = resolveDocPeriod(null, "solo.com.au", NOW, (m) => logs.push(m));
  assert.equal(a.basis, "month"); assert.equal(a.scope, "dom:solo.com.au:2026-10"); assert.equal(resetDateLabel(a.end), "1 November 2026");
  const b = resolveDocPeriod({ firmId: "lf_old", periodEnd: "2026-09-01T00:00:00.000Z" }, "old.com", NOW, (m) => logs.push(m));
  // r3: an ended period on a non-live firm keeps its last billing scope (no fresh counter), logged.
  assert.equal(b.basis, "billing"); assert.equal(b.scope, "firm:lf_old:2026-08-01T00:00:00.000Z");
  assert.equal(logs.length, 2); assert.match(logs[0], /no firm record/); assert.match(logs[1], /lf_old/);
  assert.equal(brisbaneMonth(new Date("2026-10-31T14:30:00Z")), "2026-11");
});

test("counts up to 20, then blocks with the firm's real next reset date and no price", async () => {
  const st = fakeStore(); const p = billing();
  for (let i = 1; i <= FIRM_PLAN_MONTHLY_DOCS; i++) {
    const r = await takeDocument(p, `fp${i}`, st, quiet);
    assert.ok(r.ok && r.counted); assert.equal(r.ok && r.usage?.used, i);
  }
  const over = await takeDocument(p, "fp21", st, quiet);
  assert.equal(over.ok, false);
  if (!over.ok) { assert.equal(over.usage.used, 20); assert.equal(over.usage.resetsOn, PAID.periodEnd); assert.match(over.message, /12 November 2026/); assert.doesNotMatch(over.message, /\$/); }
  assert.equal((await docUsage(p, st))!.used, 20);
});

test("a retry of the same request is not counted twice", async () => {
  const st = fakeStore(); const p = billing();
  const fp = requestFingerprint(["id-1", "trust-deed", "parties"]);
  assert.equal(fp, requestFingerprint(["id-1", "trust-deed", "parties"]));
  await takeDocument(p, fp, st, quiet);
  const again = await takeDocument(p, fp, st, quiet);
  assert.ok(again.ok && !again.counted);
  assert.equal((await docUsage(p, st))!.used, 1);
});

test("refund gives the document back", async () => {
  const st = fakeStore(); const p = billing();
  const r = await takeDocument(p, "x", st, quiet);
  assert.ok(r.ok); await r.refund();
  assert.equal((await docUsage(p, st))!.used, 0);
});

test("Enterprise override by firm id, then by domain", async () => {
  const st = fakeStore();
  st.hashes.set(DOC_CAPS_KEY, new Map([["lf_abc", "100"], ["solo.com.au", "50"]]));
  assert.equal((await docUsage(billing(), st))!.cap, 100);
  assert.equal((await docUsage(resolveDocPeriod(null, "solo.com.au", NOW, quiet), st))!.cap, 50);
});

test("fail open, with a log line, when the store is missing or unreachable", async () => {
  const logs: string[] = []; const p = billing();
  const a = await takeDocument(p, "x", null, (m) => logs.push(m));
  const b = await takeDocument(p, "x", fakeStore({ fail: true }), (m) => logs.push(m));
  assert.ok(a.ok && a.failOpen); assert.ok(b.ok && b.failOpen);
  assert.equal(logs.length, 2); assert.match(logs[1], /unreachable/);
});

test("admin counts per firm period", async () => {
  const st = fakeStore(); const p = billing(); const d = resolveDocPeriod(null, "y.com", NOW, quiet);
  await takeDocument(p, "1", st, quiet); await takeDocument(p, "2", st, quiet); await takeDocument(d, "1", st, quiet);
  assert.deepEqual(await monthlyDocCounts("2026-10", st), [
    { scope: "dom:y.com:2026-10", firm: "y.com", periodStart: "2026-10", used: 1, cap: 20 },
    { scope: p.scope, firm: "lf_abc", periodStart: PAID.periodStart, used: 2, cap: 20 },
  ]);
});

test("UI states: heads-up at 16, paused at 20; message names the date", () => {
  const u = (used: number) => ({ used, cap: 20, periodStart: "2026-10-12", resetsOn: "2026-11-12T04:00:00.000Z", warnAt: DOC_WARN_AT, basis: "billing" as const });
  assert.equal(docState(null), "none"); assert.equal(docState(u(15)), "ok"); assert.equal(docState(u(16)), "warn"); assert.equal(docState(u(20)), "full");
  assert.match(docLimitMessage(20, "2026-11-12T04:00:00.000Z"), /until 12 November 2026/);
  void ({} as DocPeriod);
});

test("r2: month arithmetic clamps to month end (31 Mar - 1 month = 28/29 Feb, never 3 Mar)", async () => {
  const { addMonthsClamped } = await import("../lib/lex-doc-allowance");
  const iso = (s: string, n: number) => new Date(addMonthsClamped(Date.parse(s), n)).toISOString();
  assert.equal(iso("2026-03-31T04:00:00.000Z", -1), "2026-02-28T04:00:00.000Z");
  assert.equal(iso("2028-03-31T04:00:00.000Z", -1), "2028-02-29T04:00:00.000Z");
  assert.equal(iso("2026-01-31T00:00:00.000Z", 1), "2026-02-28T00:00:00.000Z");
  assert.equal(iso("2026-05-31T00:00:00.000Z", -1), "2026-04-30T00:00:00.000Z");
  assert.equal(iso("2026-12-15T00:00:00.000Z", 1), "2027-01-15T00:00:00.000Z");
  const p = resolveDocPeriod({ firmId: "lf_m", periodEnd: "2026-03-31T04:00:00.000Z" }, "m.com", new Date("2026-03-10T00:00:00Z"), quiet);
  assert.equal(p.start, "2026-02-28T04:00:00.000Z");
});

test("r2: stored period ended but subscription live: rolls forward by whole intervals, never to the calendar month", () => {
  const live = { ...PAID, subscriptionId: "sub_1", status: "active" };
  const p0scope = billing().scope;
  const logs: string[] = [];
  const a = resolveDocPeriod(live, "firm.com.au", new Date("2026-11-13T00:00:00Z"), (m) => logs.push(m));
  assert.equal(a.basis, "billing");
  assert.equal(a.start, "2026-11-12T04:00:00.000Z"); assert.equal(a.end, "2026-12-12T04:00:00.000Z");
  // Same scope the renewal webhook will store, so a late webhook doesn't hand out a fresh counter.
  const after = resolveDocPeriod({ ...live, periodStart: "2026-11-12T04:00:00.000Z", periodEnd: "2026-12-12T04:00:00.000Z" }, "firm.com.au", new Date("2026-11-14T00:00:00Z"), quiet);
  assert.equal(after.scope, a.scope);
  assert.ok(logs.some((l) => l.includes("rolled forward")));
  // Several intervals late, anchored on the original day.
  const b = resolveDocPeriod(live, "firm.com.au", new Date("2027-02-20T00:00:00Z"), quiet);
  assert.equal(b.start, "2027-02-12T04:00:00.000Z"); assert.equal(b.end, "2027-03-12T04:00:00.000Z");
  // Month-end anchor keeps the 31st where it exists.
  const c = resolveDocPeriod({ firmId: "lf_e", subscriptionId: "sub_e", periodStart: "2026-01-31T00:00:00.000Z", periodEnd: "2026-02-28T00:00:00.000Z" }, "e.com", new Date("2026-03-30T00:00:00Z"), quiet);
  assert.equal(c.start, "2026-02-28T00:00:00.000Z"); assert.equal(c.end, "2026-03-31T00:00:00.000Z");
  // Exactly at the boundary: start inclusive.
  const d = resolveDocPeriod(live, "firm.com.au", new Date("2026-11-12T04:00:00.000Z"), quiet);
  assert.equal(d.start, "2026-11-12T04:00:00.000Z");
  // Lapsed or no subscription: no roll-forward and no fresh counter: the last billing scope is kept.
  const lapsed = resolveDocPeriod({ ...live, status: "lapsed" }, "firm.com.au", new Date("2026-11-13T00:00:00Z"), quiet);
  assert.equal(lapsed.basis, "billing"); assert.equal(lapsed.scope, p0scope);
  assert.equal(resolveDocPeriod(PAID, "firm.com.au", new Date("2026-11-13T00:00:00Z"), quiet).scope, p0scope);
});

test("r3: roll-forward starts at the stored period end; 29th-31st anchors survive a clamped month", () => {
  // Stored cycle is the clamped one (28 Feb to 31 Mar, anchor the 31st); renewal webhook late.
  const f = { firmId: "lf_31", subscriptionId: "sub_31", status: "active", periodStart: "2026-02-28T01:00:00.000Z", periodEnd: "2026-03-31T01:00:00.000Z" };
  const a = resolveDocPeriod(f, "x.com", new Date("2026-04-05T00:00:00Z"), quiet);
  assert.equal(a.start, "2026-03-31T01:00:00.000Z"); assert.equal(a.end, "2026-04-30T01:00:00.000Z");
  // The webhook then stores Stripe's 31 Mar to 30 Apr: same scope, same counter.
  const stored = resolveDocPeriod({ ...f, periodStart: "2026-03-31T01:00:00.000Z", periodEnd: "2026-04-30T01:00:00.000Z" }, "x.com", new Date("2026-04-05T00:00:00Z"), quiet);
  assert.equal(stored.scope, a.scope);
  // Two cycles late: 30 Apr to 31 May (back on the 31st).
  const b = resolveDocPeriod(f, "x.com", new Date("2026-05-10T00:00:00Z"), quiet);
  assert.equal(b.start, "2026-04-30T01:00:00.000Z"); assert.equal(b.end, "2026-05-31T01:00:00.000Z");
  // 29th anchor through February (non-leap): 29 Jan to 28 Feb stored, then 28 Feb to 29 Mar.
  const c = resolveDocPeriod({ ...f, periodStart: "2026-01-29T01:00:00.000Z", periodEnd: "2026-02-28T01:00:00.000Z" }, "x.com", new Date("2026-03-02T00:00:00Z"), quiet);
  assert.equal(c.start, "2026-02-28T01:00:00.000Z"); assert.equal(c.end, "2026-03-29T01:00:00.000Z");
});
