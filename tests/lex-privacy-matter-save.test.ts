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
  assert.match(privacy, /LEX_MATTERS_PRIVACY_COPY/);
  assert.match(privacy, /lexBlobUploadsEnabled\(\) \? LEX_BLOB_PRIVACY_COPY/);
  assert.match(privacy, /for 30 days after your last edit/);
});
