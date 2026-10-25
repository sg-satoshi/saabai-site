/**
 * Lex privacy: chat attachment text is masked before threads are saved.
 *   npx tsx --test tests/lex-privacy-attach-at-rest.test.ts
 */
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { __setNerForTests } from "../lib/lex-privacy/ner";
import { ATTACH_MARK, ATTACH_DROPPED, maskThreadAttachments, __clearAttachmentCacheForTests, __failMaskingForTests } from "../lib/lex-privacy/thread-attachments";
import { ATTACH_MARK as UI_MARK } from "../app/lex/_components/types";

beforeEach(() => { __setNerForTests(null); __clearAttachmentCacheForTests(); });
after(() => __setNerForTests(undefined));

const DOC = "Lease for John Smith. TFN 123 456 782. Email john@example.com. Phone 0412 345 678.";
const thread = (id: string, extra: Record<string, unknown> = {}) => ({
  id, title: "Lease", createdAt: 1, ...extra,
  messages: [
    { role: "user", content: `Is this lease ok?${ATTACH_MARK}lease.pdf\n\n${DOC}`, attachment: "lease.pdf" },
    { role: "assistant", content: "Mostly, yes." },
    { role: "user", content: "What about John Smith?" },
  ],
});
const SECRETS = ["123 456 782", "john@example.com", "0412 345 678"];

test("UI and server agree on the attachment marker", () => assert.equal(UI_MARK, ATTACH_MARK));

test("attachment text is masked, typed question and other turns untouched", async () => {
  const { threads, stats } = await maskThreadAttachments([thread("t_1700000000001")], "acme.com.au");
  const json = JSON.stringify(threads);
  for (const s of SECRETS) assert.ok(!json.includes(s), `stored ${s}`);
  const msgs = (threads[0] as { messages: Array<{ content: string; attachmentMasked?: boolean }> }).messages;
  assert.ok(msgs[0].content.startsWith(`Is this lease ok?${ATTACH_MARK}lease.pdf`));
  assert.match(msgs[0].content, /\{\{TFN_\d+\}\}/);
  assert.equal(msgs[0].attachmentMasked, true);
  assert.equal(msgs[2].content, "What about John Smith?");
  assert.equal(stats.masked, 1);
});

test("matter parties are masked in the attachment", async () => {
  const { threads } = await maskThreadAttachments([thread("t_1700000000002", { matterId: "m1" })], "acme.com.au", async (id) => (id === "m1" ? [{ name: "John Smith" }] : []));
  const first = (threads[0] as { messages: Array<{ content: string }> }).messages[0].content;
  assert.ok(!first.slice(first.indexOf(ATTACH_MARK)).includes("Smith"));
});

test("placeholders are stable per thread and differ across threads", async () => {
  const a1 = JSON.stringify((await maskThreadAttachments([thread("t_1700000000003")], "acme.com.au")).threads);
  __clearAttachmentCacheForTests();
  const a2 = JSON.stringify((await maskThreadAttachments([thread("t_1700000000003")], "acme.com.au")).threads);
  const b = JSON.stringify((await maskThreadAttachments([thread("t_1700000000004")], "acme.com.au")).threads);
  assert.equal(a1, a2);
  const tok = (s: string) => s.match(/\{\{TFN_\d+\}\}/)?.[0];
  assert.notEqual(tok(a1), tok(b));
});

test("already masked messages are not masked again, repeat saves hit the cache", async () => {
  const once = (await maskThreadAttachments([thread("t_1700000000005")], "acme.com.au")).threads;
  const twice = await maskThreadAttachments(once, "acme.com.au");
  assert.deepEqual(twice.threads, once);
  assert.equal(twice.stats.masked, 0);
  const again = await maskThreadAttachments([thread("t_1700000000005")], "acme.com.au");
  assert.equal(again.stats.cached, 1);
});

test("name model failure still masks with patterns", async () => {
  __setNerForTests(async () => { throw new Error("boom"); });
  const { threads } = await maskThreadAttachments([thread("t_1700000000006")], "acme.com.au");
  for (const s of SECRETS) assert.ok(!JSON.stringify(threads).includes(s));
});

test("fails closed: drops attachment text if masking throws", async () => {
  __failMaskingForTests(true);
  try {
    const { threads, stats } = await maskThreadAttachments([thread("t_1700000000007")], "acme.com.au");
    const first = (threads[0] as { messages: Array<{ content: string }> }).messages[0].content;
    assert.equal(stats.dropped, 1);
    assert.equal(first, `Is this lease ok?${ATTACH_MARK}lease.pdf\n\n${ATTACH_DROPPED}`);
  } finally {
    __failMaskingForTests(false);
  }
});

test("junk input passes through without throwing", async () => {
  const { threads } = await maskThreadAttachments([null, 3, { id: "x" }, { messages: [null, { role: "user", content: 5 }] }], "f");
  assert.equal(threads.length, 4);
});

test("threads route masks before saving", () => {
  const src = readFileSync("app/api/lex-threads/route.ts", "utf8");
  assert.ok(src.indexOf("maskThreadAttachments") < src.indexOf("redis.set("));
  assert.match(readFileSync("next.config.ts", "utf8"), /"\/api\/lex-threads"/);
});
