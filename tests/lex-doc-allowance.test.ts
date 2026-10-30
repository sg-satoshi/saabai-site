/** Lex Firm plan monthly document allowance.   npx tsx --test tests/lex-doc-allowance.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { takeDocument, docUsage, brisbaneMonth, resetDate, requestFingerprint, monthlyDocCounts, FIRM_PLAN_MONTHLY_DOCS, DOC_WARN_AT, DOC_CAPS_KEY } from "../lib/lex-doc-allowance";
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
  return s as unknown as Parameters<typeof takeDocument>[3] & typeof s;
}
const NOW = new Date("2026-10-30T03:00:00Z");
const quiet = () => {};

test("Brisbane month and reset date", () => {
  assert.equal(brisbaneMonth(new Date("2026-10-31T14:30:00Z")), "2026-11"); // 12:30 AM 1 Nov Brisbane
  assert.equal(brisbaneMonth(new Date("2026-10-31T13:59:00Z")), "2026-10");
  assert.equal(resetDate(NOW), "2026-11-01");
  assert.equal(resetDate(new Date("2026-12-15T00:00:00Z")), "2027-01-01");
});

test("counts up to the plan cap of 20, then blocks with the reset date", async () => {
  const st = fakeStore();
  for (let i = 1; i <= FIRM_PLAN_MONTHLY_DOCS; i++) {
    const r = await takeDocument("firm.com.au", `fp${i}`, NOW, st, quiet);
    assert.ok(r.ok && r.counted); assert.equal(r.ok && r.usage?.used, i);
  }
  const over = await takeDocument("firm.com.au", "fp21", NOW, st, quiet);
  assert.equal(over.ok, false);
  if (!over.ok) { assert.equal(over.usage.used, 20); assert.match(over.message, /1 November 2026/); assert.doesNotMatch(over.message, /\$/); }
  assert.equal((await docUsage("firm.com.au", NOW, st))!.used, 20);
});

test("a retry of the same request is not counted twice", async () => {
  const st = fakeStore();
  const fp = requestFingerprint(["id-1", "trust-deed", "parties"]);
  assert.equal(fp, requestFingerprint(["id-1", "trust-deed", "parties"]));
  await takeDocument("a.com", fp, NOW, st, quiet);
  const again = await takeDocument("a.com", fp, NOW, st, quiet);
  assert.ok(again.ok && !again.counted);
  assert.equal((await docUsage("a.com", NOW, st))!.used, 1);
});

test("refund gives the document back", async () => {
  const st = fakeStore();
  const r = await takeDocument("b.com", "x", NOW, st, quiet);
  assert.ok(r.ok); await r.refund();
  assert.equal((await docUsage("b.com", NOW, st))!.used, 0);
});

test("Enterprise override cap from the caps hash", async () => {
  const st = fakeStore();
  st.hashes.set(DOC_CAPS_KEY, new Map([["big.com", "100"]]));
  for (let i = 0; i < 25; i++) assert.ok((await takeDocument("big.com", `f${i}`, NOW, st, quiet)).ok);
  assert.equal((await docUsage("big.com", NOW, st))!.cap, 100);
});

test("fail open, with a log line, when the store is missing or unreachable", async () => {
  const logs: string[] = [];
  const a = await takeDocument("c.com", "x", NOW, null, (m) => logs.push(m));
  const b = await takeDocument("c.com", "x", NOW, fakeStore({ fail: true }), (m) => logs.push(m));
  assert.ok(a.ok && a.failOpen); assert.ok(b.ok && b.failOpen);
  assert.equal(logs.length, 2); assert.match(logs[1], /unreachable/);
});

test("admin monthly counts per firm", async () => {
  const st = fakeStore();
  await takeDocument("x.com", "1", NOW, st, quiet); await takeDocument("x.com", "2", NOW, st, quiet); await takeDocument("y.com", "1", NOW, st, quiet);
  assert.deepEqual(await monthlyDocCounts("2026-10", st), [{ firm: "x.com", used: 2, cap: 20 }, { firm: "y.com", used: 1, cap: 20 }]);
});

test("UI states: heads-up at 16, paused at 20", () => {
  const u = (used: number) => ({ used, cap: 20, month: "2026-10", resetsOn: "2026-11-01", warnAt: DOC_WARN_AT });
  assert.equal(docState(null), "none"); assert.equal(docState(u(15)), "ok"); assert.equal(docState(u(16)), "warn"); assert.equal(docState(u(20)), "full");
});
