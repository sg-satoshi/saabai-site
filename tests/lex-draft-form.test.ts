import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCUMENT_TYPES, fillPartiesTemplate } from "../lib/lex-document-types";
import { confirmField, draftGate, formProgress, parseForm, setAnswer } from "../lib/lex-draft-form";
import { prefillChecklist, type MergedDeed } from "../lib/lex-doc-extract";
import { describeDocumentPrivacy, privacyFromMasked } from "../lib/lex-privacy/document-privacy-text";

const T = fillPartiesTemplate(DOCUMENT_TYPES.find((d) => d.id === "trust-distribution-resolution")!.partiesTemplate!);

test("form is generated from the checklist template, grouped", () => {
  const f = parseForm("", T, true);
  assert.ok(f.length >= 20);
  assert.equal(f.find((x) => x.label === "Trust name")?.group, "trust");
  assert.equal(f.find((x) => x.label.startsWith("Trustee type"))?.options?.length, 3);
  assert.equal(f.find((x) => x.label.startsWith("Capital gains to stream"))?.optional, true);
  assert.ok(draftGate(f).ok, "blank form has nothing to verify");
});

test("Verify blocks drafting until confirmed; sources are kept", () => {
  const deed: MergedDeed = { profile: "trust-deed", variations: [], files: [{ file: "deed.pdf", kind: "deed" }], fields: [
    { key: "trustName", label: "Trust name", value: "Harbour Pines Family Trust", verify: false, confidence: "high", source: { file: "deed.pdf", kind: "deed", clause: "cl 1.1" } },
    { key: "vestingDate", label: "Vesting date", value: "80 years", verify: true, why: "two dates in the deed", confidence: "low", source: { file: "deed.pdf", kind: "deed", clause: "cl 1.24" } },
  ] };
  let p = prefillChecklist(T, deed);
  let f = parseForm(p, T, true);
  const tn = f.find((x) => x.label === "Trust name")!;
  assert.equal(tn.value, "Harbour Pines Family Trust");
  assert.deepEqual(tn.sources, ["deed.pdf, cl 1.1"]);
  assert.equal(tn.status, "confirmed");
  const gate = draftGate(f);
  assert.equal(gate.ok, false);
  assert.ok(gate.open.some((x) => x.label === "Vesting date under the deed"));
  assert.match(gate.reason, /Verify the \d+ answers? above to draft\./);
  // Editing alone does not clear Verify; confirming does.
  p = setAnswer(p, T, "Vesting date under the deed", "80 years from 12 March 2014");
  assert.equal(parseForm(p, T, true).find((x) => x.label === "Vesting date under the deed")!.status, "verify");
  for (const o of draftGate(parseForm(p, T, true)).open) p = confirmField(p, T, o.key);
  f = parseForm(p, T, true);
  assert.ok(draftGate(f).ok);
  assert.ok(p.includes("Vesting date under the deed: 80 years from 12 March 2014 (from deed.pdf, cl 1.24)"));
  assert.ok(formProgress(f).filled >= 2);
});

test("per-file masking counts: types and counts only", () => {
  const c = privacyFromMasked("{{PERSON_1}} and {{PERSON_2}} of {{TRUST_1}}; {{PERSON_1}} again");
  assert.deepEqual(c, { masked: 3, types: { PERSON: 2, TRUST: 1 } });
  assert.equal(describeDocumentPrivacy({ ...c, ner: "skipped" }), "3 details masked before Lex reads it: 2 names, 1 trust");
  const route = readFileSync("app/api/lex-doc-extract/route.ts", "utf8");
  assert.match(route, /privacyFromMasked\(masked\)/);
});

test("workspace copy: no server-side saving claims, no dashes, retention TODO visible", () => {
  const src = readFileSync("app/lex/_components/DraftWorkspace.tsx", "utf8") + readFileSync("app/lex/_components/Drafting.tsx", "utf8");
  assert.ok(src.includes("Progress saved in this browser."));
  assert.ok(src.includes("Other drafts in progress in this browser"));
  assert.ok(!/firm's Lex account|saves to this matter|Missing items are fine/i.test(src));
  assert.ok(src.includes("[RETENTION: pending Shane]"));
  assert.ok(!/[\u2013\u2014]/.test(src + readFileSync("app/lex/_components/draft-workspace.css", "utf8")));
});
