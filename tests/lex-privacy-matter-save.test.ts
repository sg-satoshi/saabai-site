/**
 * Lex privacy: finished drafts and reviews are only saved to a matter with Save to matter.
 *   npx tsx --test tests/lex-privacy-matter-save.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCS_FLOW_COPY, canSaveToMatter, matterSaveNotice, reviewMatterSaveNotice } from "../lib/lex-docs-flow";
import { LEX_MATTERS_PRIVACY_COPY } from "../lib/lex-upload-copy";

const page = readFileSync("app/lex/page.tsx", "utf8");
const privacy = readFileSync("app/privacy/page.tsx", "utf8");

test("no effect auto-attaches finished drafts or reviews to a matter", () => {
  const effects = page.split("useEffect(").slice(1).map(e => e.slice(0, e.indexOf("}, [")));
  for (const e of effects) {
    assert.ok(!/kind: "draft"/.test(e), "draft attach inside useEffect");
    assert.ok(!/kind: "review"/.test(e), "review attach inside useEffect");
  }
  assert.doesNotMatch(page, /\}, \[draftLoading, draftQALoading\]\)/);
  assert.doesNotMatch(page, /\}, \[reviewLoading, reviewReport\]\)/);
});

test("Save to matter buttons call the explicit save", () => {
  assert.match(page, /onSave=\{\(\) => saveToMatter\("draft"\)\}/);
  assert.match(page, /onSave=\{\(\) => saveToMatter\("review"\)\}/);
  const bar = readFileSync("app/lex/_components/MatterSaveBar.tsx", "utf8");
  assert.match(bar, /onClick=\{p\.onSave\}/);
});

test("button only offered for a finished result with an active matter", () => {
  assert.equal(canSaveToMatter({ activeMatterId: "m1", hasResult: true, busy: false }), true);
  assert.equal(canSaveToMatter({ activeMatterId: null, hasResult: true, busy: false }), false);
  assert.equal(canSaveToMatter({ activeMatterId: "m1", hasResult: false, busy: false }), false);
  assert.equal(canSaveToMatter({ activeMatterId: "m1", hasResult: true, busy: true }), false);
});

test("copy", () => {
  assert.equal(matterSaveNotice("Smith Estate"), "Saves the finished draft to Smith Estate on our servers so your firm can see it.");
  assert.equal(reviewMatterSaveNotice("Smith Estate"), "Saves this review, including the document text, to Smith Estate on our servers so your firm can see it.");
  assert.equal(DOCS_FLOW_COPY.finishedDraftsNote, "Finished drafts are only saved to a matter if you choose Save to matter.");
  assert.equal(DOCS_FLOW_COPY.saveToMatter, "Save to matter");
  assert.equal(DOCS_FLOW_COPY.progressSaved, "Progress saved in this browser.");
  assert.match(LEX_MATTERS_PRIVACY_COPY, /90 days/);
  assert.match(LEX_MATTERS_PRIVACY_COPY, /everyone in your firm can see it/);
  assert.match(LEX_MATTERS_PRIVACY_COPY, /types and number of items masked/);
  assert.match(privacy, /heading: "6. Lex matters, research chats and masking logs",\n    body: LEX_MATTERS_PRIVACY_COPY/);
  assert.match(privacy, /lexBlobUploadsEnabled\(\) \? LEX_BLOB_PRIVACY_COPY/);
  assert.match(privacy, /for 30 days after your last edit/);
});

// ── Round 2: research items are masked before they are saved to a matter ──
import { after as after2, beforeEach as beforeEach2 } from "node:test";
import { __setNerForTests } from "../lib/lex-privacy/ner";
import { ATTACH_MARK, ATTACH_DROPPED, maskResearchMatterItem, __clearAttachmentCacheForTests, __failMaskingForTests } from "../lib/lex-privacy/thread-attachments";
import { matterSaveLabel } from "../app/lex/_components/MatterSaveBar";

beforeEach2(() => { __setNerForTests(null); __clearAttachmentCacheForTests(); __failMaskingForTests(false); });
after2(() => { __setNerForTests(undefined); __failMaskingForTests(false); });

const DOC = "Lease for John Smith. TFN 123 456 782. Email john@example.com. Phone 0412 345 678.";
const researchItem = () => ({
  ref: "research:1700000000001", kind: "research", title: "Lease",
  data: { messages: [
    { role: "user", content: `Is this lease ok?${ATTACH_MARK}lease.pdf\n\n${DOC}`, attachment: "lease.pdf" },
    { role: "assistant", content: "Mostly, yes." },
    { role: "user", content: "What about John Smith?" },
  ] },
});

test("research matter item: attachment text masked, typed question keeps real names", async () => {
  const { item, stats } = await maskResearchMatterItem(researchItem(), "acme.com.au", "m1", async (id) => (id === "m1" ? [{ name: "John Smith" }] : []));
  const msgs = (item.data as { messages: Array<{ content: string; attachmentMasked?: boolean }> }).messages;
  const att = msgs[0].content.slice(msgs[0].content.indexOf(ATTACH_MARK));
  for (const s of ["123 456 782", "john@example.com", "0412 345 678", "Smith"]) assert.ok(!att.includes(s), `stored ${s}`);
  assert.equal(msgs[0].attachmentMasked, true);
  assert.equal(msgs[2].content, "What about John Smith?");
  assert.equal(stats.masked, 1);
});

test("research matter item: masking failure drops the attachment text", async () => {
  __failMaskingForTests(true);
  const { item, stats } = await maskResearchMatterItem(researchItem(), "acme.com.au", "m1");
  const json = JSON.stringify(item);
  assert.ok(!json.includes("123 456 782"));
  assert.ok(json.includes(ATTACH_DROPPED));
  assert.equal(stats.dropped, 1);
});

test("draft and review items are not masked (copy: they keep real names)", async () => {
  const draft = { ref: "draft:x", kind: "draft", title: "Deed", data: { text: DOC } };
  assert.deepEqual((await maskResearchMatterItem(draft, "acme.com.au", "m1")).item, draft);
});

test("items route masks before putItem", () => {
  const route = readFileSync("app/api/lex-matters/[id]/items/route.ts", "utf8");
  assert.ok(route.indexOf("maskResearchMatterItem(") > 0 && route.indexOf("maskResearchMatterItem(") < route.indexOf("putItem(who.firm"));
});

test("save states: Saved only after success, error keeps retry", () => {
  assert.equal(matterSaveLabel("saving"), "Saving…");
  assert.equal(matterSaveLabel("saved"), "Saved to matter");
  assert.equal(matterSaveLabel("error"), "Save to matter");
  assert.equal(matterSaveLabel(undefined), "Save to matter");
  assert.equal(DOCS_FLOW_COPY.matterSaveError, "That could not be saved to the matter. Try again.");
  assert.match(page, /const ok = await attachToMatter\(/);
  assert.match(page, /ok \? "saved" : "error"/);
  const bar = readFileSync("app/lex/_components/MatterSaveBar.tsx", "utf8");
  assert.match(bar, /disabled=\{p\.state === "saving" \|\| p\.state === "saved"\}/);
});
