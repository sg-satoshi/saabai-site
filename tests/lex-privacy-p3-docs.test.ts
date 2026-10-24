/**
 * Lex privacy Phase 3: uploaded document privacy preview.
 *   npx tsx --test tests/lex-privacy-p3-docs.test.ts
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { __setNerForTests } from "../lib/lex-privacy/ner";
import { previewDocumentMasking } from "../lib/lex-privacy/document-preview";
import { describeDocumentPrivacy } from "../lib/lex-privacy/document-privacy-text";

after(() => __setNerForTests(undefined));

const DOC = "Deed between John Smith and Acme Holdings Pty Ltd. TFN 123 456 782. Email john@example.com. Call 0412 345 678.";

test("counts what will be masked, never returns values", async () => {
  __setNerForTests(null);
  const p = await previewDocumentMasking(DOC, [{ name: "John Smith" }]);
  assert.ok(p.masked >= 3, JSON.stringify(p));
  assert.equal(p.types.PERSON, 1);
  assert.equal(p.types.TFN, 1);
  assert.equal(p.types.EMAIL, 1);
  const json = JSON.stringify(p);
  for (const v of ["John", "Smith", "123 456 782", "john@example.com", "0412"]) assert.ok(!json.includes(v), `leaked ${v}`);
});

test("name model finds names with no matter parties", async () => {
  __setNerForTests(async () => [
    { entity: "B-PER", word: "Margaret", score: 0.99, start: 0, end: 8, index: 1 },
    { entity: "I-PER", word: "Okafor", score: 0.99, start: 9, end: 15, index: 2 },
  ] as never);
  const p = await previewDocumentMasking("Margaret Okafor signed the lease.");
  assert.ok(["on", "failed"].includes(p.ner), p.ner);
  __setNerForTests(undefined);
});

test("model failure never blocks the preview", async () => {
  __setNerForTests(async () => { throw new Error("boom Margaret Okafor"); });
  const p = await previewDocumentMasking(DOC);
  assert.ok(p.masked >= 2);
  assert.ok(!JSON.stringify(p).includes("Margaret"));
  __setNerForTests(undefined);
});

test("empty text is a no-op", async () => {
  assert.deepEqual(await previewDocumentMasking("   "), { masked: 0, types: {}, ner: "skipped" });
});

test("plain wording, no dashes", () => {
  assert.equal(describeDocumentPrivacy({ masked: 4, types: { PERSON: 3, TFN: 1 }, ner: "on" }), "4 details masked before Lex reads it: 3 names, 1 TFN");
  assert.equal(describeDocumentPrivacy({ masked: 1, types: { ADDRESS: 1 }, ner: "on" }), "1 detail masked before Lex reads it: 1 address");
  assert.equal(describeDocumentPrivacy({ masked: 0, types: {}, ner: "on" }), "No personal details found to mask.");
  for (const s of [describeDocumentPrivacy({ masked: 0, types: {}, ner: "skipped", error: true }), describeDocumentPrivacy({ masked: 2, types: { COMPANY: 2 }, ner: "on" })]) assert.ok(!/[\u2013\u2014]/.test(s));
});

test("extract route runs the preview and ships the name model", () => {
  const route = readFileSync("app/api/lex-extract/route.ts", "utf8");
  assert.match(route, /previewDocumentMasking/);
  assert.match(readFileSync("next.config.ts", "utf8"), /"\/api\/lex-extract"/);
  // The browser bundle must not import the model code.
  assert.doesNotMatch(readFileSync("app/lex/page.tsx", "utf8"), /document-preview"/);
});
