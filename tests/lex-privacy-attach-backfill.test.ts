/**
 * Lex privacy: one-off backfill of stored thread attachments.
 *   npx tsx --test tests/lex-privacy-attach-backfill.test.ts
 */
import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { __setNerForTests } from "../lib/lex-privacy/ner";
import { ATTACH_MARK, __clearAttachmentCacheForTests, __failMaskingForTests } from "../lib/lex-privacy/thread-attachments";
import { backfillAttachments, keyTag, type BackfillStore } from "../lib/lex-privacy/backfill-attachments";

beforeEach(() => { __setNerForTests(null); __clearAttachmentCacheForTests(); });
after(() => __setNerForTests(undefined));

const DOC = "Lease for John Smith. TFN 123 456 782. Email john@example.com.";
const SECRETS = ["123 456 782", "john@example.com", "John Smith", "jane@firm.com.au"];
const threads = () => [{ id: "t_1700000000001", title: "Lease", createdAt: 1, matterId: "SG-2026-0001", messages: [
  { role: "user", content: `Check this${ATTACH_MARK}lease.pdf\n\n${DOC}`, attachment: "lease.pdf" },
  { role: "assistant", content: "Looks fine." },
] }];

function memStore(data: Record<string, unknown>, ttls: Record<string, number> = {}) {
  const writes: Array<{ key: string; ttl: number | null }> = [];
  const store: BackfillStore = {
    async *keys() { for (const k of Object.keys(data)) yield k; },
    get: async (k) => data[k],
    ttl: async (k) => ttls[k] ?? -1,
    set: async (k, v, ttl) => { data[k] = v; writes.push({ key: k, ttl }); },
  };
  return { store, writes, data };
}
const opts = (dryRun: boolean, logs: string[] = []) => ({
  dryRun, firmFor: (e: string) => e.split("@")[1] ?? e,
  loadMatter: async (_f: string, id: string) => (id === "SG-2026-0001" ? { client: "John Smith" } : null),
  onProgress: (l: string) => logs.push(l),
});

test("dry run counts and writes nothing", async () => {
  const before = JSON.stringify(threads());
  const m = memStore({ "lex:threads:jane@firm.com.au": before, "other:key": "x" });
  const logs: string[] = [];
  const r = await backfillAttachments(m.store, opts(true, logs));
  assert.equal(m.writes.length, 0);
  assert.equal(m.data["lex:threads:jane@firm.com.au"], before);
  assert.deepEqual({ keys: r.keys, raw: r.keysWithRawAttachments, masked: r.attachmentsMasked, written: r.keysWritten }, { keys: 1, raw: 1, masked: 1, written: 0 });
  for (const s of SECRETS) assert.ok(!JSON.stringify(r).includes(s) && !logs.join("\n").includes(s));
});

test("apply masks, keeps TTL, never logs values", async () => {
  const m = memStore({ "lex:threads:jane@firm.com.au": JSON.stringify(threads()) }, { "lex:threads:jane@firm.com.au": 5000 });
  const logs: string[] = [];
  const r = await backfillAttachments(m.store, opts(false, logs));
  assert.equal(r.keysWritten, 1);
  assert.equal(r.attachmentsMasked, 1);
  assert.deepEqual(m.writes, [{ key: "lex:threads:jane@firm.com.au", ttl: 5000 }]);
  const stored = String(m.data["lex:threads:jane@firm.com.au"]);
  for (const s of ["123 456 782", "john@example.com"]) assert.ok(!stored.includes(s));
  assert.ok(!stored.slice(stored.indexOf("lease.pdf")).includes("John Smith"), "matter party masked");
  assert.match(stored, /"attachmentMasked":true/);
  for (const s of SECRETS) assert.ok(!logs.join("\n").includes(s) && !JSON.stringify(r).includes(s));
  assert.ok(logs[0].includes(keyTag("lex:threads:jane@firm.com.au")));
});

test("idempotent: a second run changes nothing", async () => {
  const m = memStore({ "lex:threads:jane@firm.com.au": JSON.stringify(threads()) });
  await backfillAttachments(m.store, opts(false));
  const once = m.data["lex:threads:jane@firm.com.au"];
  const r2 = await backfillAttachments(m.store, opts(false));
  assert.equal(r2.keysWritten, 0);
  assert.equal(r2.attachmentsAlreadyMasked, 1);
  assert.equal(m.data["lex:threads:jane@firm.com.au"], once);
});

test("fails closed: unmaskable text is dropped, not kept", async () => {
  __failMaskingForTests(true);
  try {
    const m = memStore({ "lex:threads:jane@firm.com.au": JSON.stringify(threads()) });
    const r = await backfillAttachments(m.store, opts(false));
    assert.equal(r.attachmentsDropped, 1);
    assert.ok(!String(m.data["lex:threads:jane@firm.com.au"]).includes("123 456 782"));
  } finally { __failMaskingForTests(false); }
});

test("bad JSON and store errors are counted, never thrown", async () => {
  const m = memStore({ "lex:threads:a@b.com": "{not json", "lex:threads:c@d.com": JSON.stringify(threads()) });
  m.store.ttl = async () => { throw new Error("redis down"); };
  const r = await backfillAttachments(m.store, opts(false));
  assert.equal(r.keys, 2);
  assert.equal(r.errors, 1);
  assert.equal(m.writes.length, 0);
});
