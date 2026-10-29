import { test } from "node:test";
import assert from "node:assert/strict";
import { DOCUMENT_TYPES, fillPartiesTemplate } from "../lib/lex-document-types";
import { fieldText, groupSummary, parseForm, setAnswer, serverVerifyGate } from "../lib/lex-draft-form";
import { prefillChecklist, type MergedDeed } from "../lib/lex-doc-extract";
import { parseProgress } from "../lib/lex-draft-progress";

const T = fillPartiesTemplate(DOCUMENT_TYPES.find((d) => d.id === "trust-distribution-resolution")!.partiesTemplate!);
const field = (p: string, key: string) => parseForm(p, T, true).find((f) => f.key === key)!;

/** Types `text` one key at a time the way the field card does: the input shows fieldText(typed, stored). */
function typeInto(parties: string, key: string, text: string): { parties: string; shown: string } {
  let typed: string | undefined;
  let shown = fieldText(typed, field(parties, key).value);
  for (const ch of text) {
    typed = shown + ch; // the browser appends to what the input currently shows
    parties = setAnswer(parties, T, key, typed);
    shown = fieldText(typed, field(parties, key).value);
  }
  return { parties, shown };
}

// Trust Distribution Resolution fields from Shane's report, plus a multiline list (textarea).
const CASES: [string, string][] = [
  ["Trust name", "Harbour Pines Family Trust"],
  ["State the trust was settled in, and governing law clause in the deed", "South Australia, clause 22 governing law"],
  ["Vesting date under the deed", "80 years from 12 March 2014"],
  ["Trust deed date and any deeds of variation (dates)", "12 March 2014 and 3 June 2019"],
  ["Deed clause numbers (income definition, power to appoint income, power to determine income or classes, streaming power, default beneficiaries, resolution deadline, excluded persons)", "cl 1.1 income, cl 4.2 appoint, cl 4.5 streaming"],
  ["Trustee name(s) (and ACN if a company)", "Harbour Pines Pty Ltd ACN 123 456 789"],
  ["How entitlements will be paid (cash, loan account, held for company beneficiary)", "cash and loan account"],
];

test("every keystroke keeps spaces between words (inputs and textareas)", () => {
  for (const [key, text] of CASES) {
    const r = typeInto("", key, text);
    assert.equal(r.shown, text, `${key}: shown while typing`);
    assert.equal(field(r.parties, key).value, text, `${key}: stored`);
  }
});

test("multiline textarea keeps spaces in each line", () => {
  const key = parseForm("", T, true).find((f) => f.multiline)!.key;
  const r = typeInto("", key, "1. John Smith 50%\n2. Mary Jane Smith balance");
  assert.match(r.shown, /John Smith 50%/);
  assert.match(r.shown, /Mary Jane Smith balance/);
  assert.match(field(r.parties, key).value, /Mary Jane Smith balance/);
});

test("spaces survive saved progress, review summary and the draft payload", () => {
  let p = "";
  for (const [key, text] of CASES) p = typeInto(p, key, text).parties;
  const saved = JSON.stringify({ v: 1, savedAt: Date.now(), typeId: "trust-distribution-resolution", parties: p, instructions: "", jurisdiction: "SA", prep: { extracted: null, manual: [] } });
  const restored = parseProgress(saved)!.parties;
  assert.equal(restored, p);
  const fields = parseForm(restored, T, true);
  const summary = groupSummary(fields);
  assert.match(summary, /South Australia/);
  assert.match(summary, /Harbour Pines Family Trust/);
  // The draft request sends the checklist text (parties) as is.
  const body = JSON.parse(JSON.stringify({ parties: restored }));
  assert.match(body.parties, /South Australia/);
  assert.match(body.parties, /80 years from 12 March 2014/);
  assert.equal(serverVerifyGate(body.parties, T, true), null);
});

test("upload prefill keeps spaces and replaces stale typed text", () => {
  const deed: MergedDeed = { profile: "trust-deed", variations: [], files: [{ file: "deed.pdf", kind: "deed" }], fields: [
    { key: "trustName", label: "Trust name", value: "Harbour Pines Family Trust", verify: false, confidence: "high", source: { file: "deed.pdf", kind: "deed", clause: "cl 1.1" } },
  ] };
  const p = prefillChecklist(T, deed);
  assert.equal(field(p, "Trust name").value, "Harbour Pines Family Trust");
  assert.equal(fieldText("Old name", field(p, "Trust name").value), "Harbour Pines Family Trust");
  const r = typeInto(p, "Trust name", " Two");
  assert.equal(field(r.parties, "Trust name").value, "Harbour Pines Family Trust Two");
  assert.deepEqual(field(r.parties, "Trust name").sources, ["deed.pdf, cl 1.1"]);
});

test("fieldText shows the typed text only while it matches the stored answer", () => {
  assert.equal(fieldText("South ", "South"), "South ");
  assert.equal(fieldText(undefined, "South"), "South");
  assert.equal(fieldText("North", "South"), "South");
});
