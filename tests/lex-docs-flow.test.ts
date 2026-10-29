import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCUMENT_TYPES, fillPartiesTemplate } from "../lib/lex-document-types";
import { needDone, needsFor } from "../lib/lex-doc-needs";
import { draftGate, parseForm, setAnswer, confirmField, serverVerifyGate } from "../lib/lex-draft-form";
import { PROGRESS_TTL_MS, parseProgress, hasProgress } from "../lib/lex-draft-progress";
import { DOCS_FLOW_COPY, DOCS_FLOW_OPTIONS, draftLabel, savedLabel, splitTiles } from "../lib/lex-docs-flow";
import type { MergedDeed } from "../lib/lex-doc-extract";

const TDR = DOCUMENT_TYPES.find((d) => d.id === "trust-distribution-resolution")!;
const T = fillPartiesTemplate(TDR.partiesTemplate!);
const need = (id: string) => needsFor(TDR.id, TDR.category).find((n) => n.id === id)!;

test("checklist: items tick from uploaded file kinds", () => {
  const deed: MergedDeed = { profile: "trust-deed", variations: [], fields: [], files: [
    { file: "deed.pdf", kind: "deed" }, { file: "var.pdf", kind: "variation" }, { file: "fte.pdf", kind: "family-trust-election" }, { file: "min.pdf", kind: "minutes" },
  ] };
  for (const id of ["deed", "variations", "fte", "minutes"]) assert.equal(needDone(need(id), { extracted: deed, parties: "", template: T }), true, id);
  assert.equal(needDone(need("asic"), { extracted: deed, parties: "", template: T }), false);
});

test("checklist: items tick from extracted fields, not from empty values", () => {
  const ex = (value: string): MergedDeed => ({ profile: "trust-deed", variations: [], files: [], fields: [{ key: "trusteeAcn", label: "ACN", value, verify: false, confidence: "high" }] });
  assert.equal(needDone(need("asic"), { extracted: ex("111 222 333"), parties: "", template: T }), true);
  assert.equal(needDone(need("asic"), { extracted: ex(""), parties: "", template: T }), false);
});

test("checklist: items tick as form lines are filled, not by the template text, and by hand", () => {
  const when = need("when");
  assert.equal(needDone(when, { parties: T, template: T }), false, "template alone ticks nothing");
  const key = parseForm(T, T, true).find((f) => f.label.startsWith("Date, time and place"))!.key;
  const filled = setAnswer(T, T, key, "29 June 2027, 10 AM, Brisbane office, Alex Example present");
  assert.equal(needDone(when, { parties: filled, template: T }), true);
  assert.equal(needDone(when, { parties: "", template: T, manual: ["when"] }), true);
});

test("Draft is blocked until every Verify is resolved, client and server", () => {
  const f0 = parseForm(T, T, true);
  const a = f0.find((f) => f.label === "Trust name")!.key;
  const b = f0.find((f) => f.label.startsWith("Vesting date"))!.key;
  let p = T.replace(/^Trust name:.*$/m, "Trust name: Harbour Pines Family Trust (from deed.pdf, cl 1.1) [VERIFY: two names in the deed]")
    .replace(/^(Vesting date[^:]*):.*$/m, "$1: 80 years (from deed.pdf, cl 1.24) [VERIFY: two dates]");
  let g = draftGate(parseForm(p, T, true));
  assert.equal(g.ok, false); assert.equal(g.open.length, 2); assert.equal(g.reason, "Verify the 2 answers above to draft.");
  assert.ok(serverVerifyGate(p, T, true));
  // Editing the answer does not clear Verify.
  p = setAnswer(p, T, a, "Harbour Pines Family Trust");
  assert.equal(draftGate(parseForm(p, T, true)).open.length, 2);
  p = confirmField(p, T, a);
  g = draftGate(parseForm(p, T, true));
  assert.equal(g.ok, false); assert.equal(g.reason, "Verify the answer above to draft.");
  p = confirmField(p, T, b);
  assert.equal(draftGate(parseForm(p, T, true)).ok, true);
  assert.equal(serverVerifyGate(p, T, true), null);
  assert.match(p, /\(from deed\.pdf, cl 1\.1\)/, "source kept after confirm");
});

test("local drafts expire 30 days after the last edit", () => {
  const now = Date.UTC(2026, 9, 30);
  const draft = (savedAt: number) => JSON.stringify({ v: 1, savedAt, typeId: TDR.id, jurisdiction: "Queensland (QLD)", parties: "Trust name: X", instructions: "", prep: { extracted: null, manual: [] } });
  assert.equal(PROGRESS_TTL_MS, 30 * 24 * 60 * 60 * 1000);
  assert.ok(parseProgress(draft(now - PROGRESS_TTL_MS + 1000), now));
  assert.ok(parseProgress(draft(now - PROGRESS_TTL_MS), now), "exactly 30 days still valid");
  assert.equal(parseProgress(draft(now - PROGRESS_TTL_MS - 1), now), null);
  // An edit resets the clock: savedAt is the last edit.
  assert.ok(parseProgress(draft(now - 29 * 864e5), now));
  assert.equal(parseProgress("not json", now), null);
  assert.equal(parseProgress(JSON.stringify({ v: 2, savedAt: now }), now), null);
  assert.equal(hasProgress({ typeId: TDR.id, jurisdiction: "", parties: " ", instructions: "", prep: { extracted: null, manual: [] } }), false);
});

test("copy strings are exact, browser-only, no dashes, no matter or account claims", () => {
  assert.equal(DOCS_FLOW_COPY.progressSaved, "Progress saved in this browser.");
  assert.equal(DOCS_FLOW_COPY.draftsListTitle, "Drafts in this browser");
  assert.equal(DOCS_FLOW_COPY.retention, "Saved in this browser for 30 days. Not synced to other devices.");
  assert.equal(savedLabel("3:52\u00a0PM"), "Saved in this browser 3:52\u00a0PM");
  assert.equal(draftLabel("Trust Distribution Resolution", "Harbour Pines Family Trust", "30 June 2027"), "Draft: Harbour Pines, FY2027 distributions");
  assert.equal(draftLabel("Trust Distribution Resolution", "Harbour Pines Family Trust"), "Draft: Harbour Pines");
  assert.equal(draftLabel("Trust Distribution Resolution", ""), "Draft: Trust Distribution Resolution");
  const ui = readFileSync("app/lex/_components/DraftWorkspace.tsx", "utf8");
  const all = [...Object.values(DOCS_FLOW_COPY), ui].join("\n");
  assert.doesNotMatch(all, /[\u2013\u2014]/, "no en or em dashes");
  assert.doesNotMatch(all, /Matter:|Lex account|saves to this matter|Other drafts/);
  for (const k of ["draftsListTitle", "retention", "railFoot", "uploadNote", "progressSaved"] as const) assert.match(ui, new RegExp(`COPY\\.${k}`), k);
  assert.match(ui, /savedLabel\(/); assert.match(ui, /draftLabel\(/);
});

test("open questions use Designer's defaults and switch cleanly", () => {
  assert.equal(DOCS_FLOW_OPTIONS.verifyConfirm, "drawer");
  assert.equal(DOCS_FLOW_OPTIONS.tilePicker, "all");
  assert.equal(DOCS_FLOW_OPTIONS.guidedPreselectFromDeed, false);
  const all = splitTiles(DOCUMENT_TYPES, "all");
  assert.equal(all.tiles.length, DOCUMENT_TYPES.length); assert.equal(all.more.length, 0);
  const reg = splitTiles(DOCUMENT_TYPES, "registry-first");
  assert.ok(reg.tiles.some((d) => d.id === TDR.id));
  assert.equal(reg.tiles.length + reg.more.length, DOCUMENT_TYPES.length);
});
