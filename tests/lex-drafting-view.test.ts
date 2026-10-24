import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  splitDraft, segmentDraft, verifyMarkers, draftReferences, clauseIdOf, normaliseClauseId,
  confidenceBand, orderSections, QA_STATUS,
} from "../lib/lex-draft-display";

const DRAFT = `NOTICE OF OBJECTION

1. Grounds of objection

1.1 The taxpayer objects to the amended assessment under s 175A of the Taxation Administration Act 1953.

1.2 The Commissioner erred in treating the shortfall as a deemed dividend under s 109D [VERIFY: confirm the 2019 amendments].

See also Smith v Commissioner of Taxation [2019] FCA 123 and TR 2010/3.`;

test("splitDraft finds the title, headings and numbered clauses", () => {
  const b = splitDraft(DRAFT);
  assert.equal(b[0].kind, "title");
  assert.equal(b[0].text, "NOTICE OF OBJECTION");
  assert.equal(b[1].kind, "heading");
  assert.equal(b[2].kind, "para");
  assert.equal(b[2].clauseId, "1.1");
  assert.equal(b[3].clauseId, "1.2");
  assert.equal(b[4].clauseId, undefined);
});

test("clause ids normalise from QA labels", () => {
  assert.equal(clauseIdOf("Clause 3. Term"), "3");
  assert.equal(clauseIdOf("A taxpayer may object"), undefined);
  assert.equal(normaliseClauseId("Clause 1.2"), "1.2");
  assert.equal(normaliseClauseId("cl 4.1."), "4.1");
});

test("VERIFY markers become warnings, references become cite chips", () => {
  const segs = segmentDraft("Under s 109D [VERIFY: check the year] and [2019] FCA 123.");
  assert.deepEqual(segs.filter((s) => s.kind === "verify").map((s) => s.text), ["check the year"]);
  assert.ok(segs.some((s) => s.kind === "ref" && s.text === "s 109D"));
  assert.ok(segs.some((s) => s.kind === "ref" && s.text === "[2019] FCA 123"));
  assert.equal(segs.map((s) => s.kind === "verify" ? "" : s.text).join(""), "Under s 109D  and [2019] FCA 123.");
});

test("markers and unique references are collected in order", () => {
  assert.deepEqual(verifyMarkers(DRAFT), ["confirm the 2019 amendments"]);
  const refs = draftReferences(DRAFT);
  assert.ok(refs[0].startsWith("s 175A"));
  assert.ok(refs.includes("s 109D"));
  assert.ok(refs.includes("[2019] FCA 123"));
  assert.ok(refs.includes("TR 2010/3"));
  assert.equal(new Set(refs).size, refs.length);
});

test("QA bands and ordering use plain words", () => {
  assert.equal(confidenceBand(90).label, "High confidence");
  assert.equal(confidenceBand(70).tone, "warn");
  assert.equal(confidenceBand(10).tone, "bad");
  const o = orderSections([
    { id: "1", clause: "a", status: "verified", note: "" },
    { id: "2", clause: "b", status: "unverified", note: "" },
    { id: "3", clause: "c", status: "flagged", note: "" },
  ]);
  assert.deepEqual(o.map((s) => s.id), ["3", "2", "1"]);
  assert.equal(QA_STATUS.flagged.label, "Needs review");
});

test("drafting view: no em dashes, footer credit kept, legacy dark panel gone", () => {
  const files = ["app/lex/_components/Drafting.tsx", "app/lex/_components/drafting.css", "app/lex/_components/exportDraft.ts", "lib/lex-draft-display.ts"];
  for (const f of files) assert.ok(!readFileSync(f, "utf8").includes("\u2014"), `${f} has an em dash`);
  assert.match(readFileSync("app/lex/_components/exportDraft.ts", "utf8"), /Powered by Saabai\.ai/);
  const page = readFileSync("app/lex/page.tsx", "utf8");
  assert.ok(!page.includes("Document Configuration"), "old drafting panel still in page.tsx");
  assert.ok(page.includes("<DraftingView"));
});
