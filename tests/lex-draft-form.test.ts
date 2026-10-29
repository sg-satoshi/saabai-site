import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCUMENT_TYPES, fillPartiesTemplate } from "../lib/lex-document-types";
import { confirmField, draftGate, formProgress, groupSummary, groupsOf, parseForm, serverVerifyGate, setAnswer } from "../lib/lex-draft-form";
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

test("workspace copy: no server-side saving claims, no dashes, retention copy matches the ruling", () => {
  const src = readFileSync("app/lex/_components/DraftWorkspace.tsx", "utf8") + readFileSync("app/lex/_components/Drafting.tsx", "utf8");
  assert.ok(src.includes("Progress saved in this browser."));
  assert.ok(src.includes("Other drafts in progress in this browser"));
  assert.ok(!/firm's Lex account|saves to this matter|Missing items are fine/i.test(src));
  assert.ok(!src.includes("[RETENTION") && src.includes("for 30 days") && src.includes("Uploaded files are not kept"));
  const privacy = readFileSync("app/privacy/page.tsx", "utf8");
  assert.match(privacy, /Lex Draft Documents/);
  assert.match(privacy, /do not store uploaded files on our servers/);
  assert.match(privacy, /30 days after your last edit/);
  assert.ok(!/[\u2013\u2014]/.test(privacy.slice(privacy.indexOf("Lex Draft Documents"), privacy.indexOf("How we use it"))));
  assert.ok(!/[\u2013\u2014]/.test(src + readFileSync("app/lex/_components/draft-workspace.css", "utf8")));
});

test("server Verify gate: the draft route rejects an unresolved Verify with 409", async () => {
  const f0 = parseForm("", T, true);
  const parties = setAnswer(T, T, f0[0].key, "Harbour Pines Family Trust (from Trust deed.pdf, cl 1.1) [VERIFY: name differs on page 2]");
  assert.match(serverVerifyGate(parties, T, true) ?? "", /cannot draft yet\. One answer still needs verifying/);
  assert.equal(serverVerifyGate(confirmField(parties, T, f0[0].key), T, true), null);
  assert.ok(serverVerifyGate("Notes [verify: x]", T, true), "any [VERIFY marker blocks");
  assert.ok(serverVerifyGate("Anything [VERIFY: x]", undefined, false), "types without a checklist are gated on the marker");
  assert.equal(serverVerifyGate("Anything", undefined, false), null, "and only on the marker");
  const { POST } = await import("../app/api/lex-draft/route");
  const res = await POST(new Request("http://local.test/api/lex-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: "trust-distribution-resolution", parties, jurisdiction: "QLD" }) }));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /verifying/);
});

test("review summary skips hints, defaults, empty labels and bare list markers (real template)", () => {
  const blank = parseForm("", T, true);
  for (const g of groupsOf(blank)) assert.equal(groupSummary(blank.filter((f) => f.group === g)), "", `blank ${g} summary is empty`);
  const deedKey = blank.find((f) => f.label.startsWith("Deed clause numbers"))!.key;
  let p = setAnswer(T, T, deedKey, "income definition: cl 1.12; power to appoint income:; streaming power: cl 9");
  const benKey = blank.find((f) => f.label.startsWith("Beneficiaries and shares"))!.key;
  p = setAnswer(p, T, benKey, "  1. Jane Citizen 60%\n  2.");
  const f = parseForm(p, T, true);
  const deed = groupSummary(f.filter((x) => x.group === "deed"));
  assert.equal(deed, "income definition: cl 1.12; streaming power: cl 9");
  const ben = groupSummary(f.filter((x) => x.group === "beneficiaries"));
  assert.equal(ben, "Jane Citizen 60%");
  assert.ok(!/specified individual|Interposed entity elections|\b1\.,/.test(ben));
  const sign = groupSummary(f.filter((x) => x.group === "signing"));
  assert.ok(!/change to an earlier year/.test(sign), sign);
});

test("server gate blocks any [VERIFY marker for every document type", async () => {
  const { POST } = await import("../app/api/lex-draft/route");
  const call = (body: object) => POST(new Request("http://local.test/api/lex-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  for (const documentType of [undefined, "custom", "Custom", "no-such-type", "Trust-Distribution-Resolution", "service-agreement"]) {
    for (const parties of ["Party A [VERIFY: name]", "Party A [ verify]", "Party A [Verify:x]"]) {
      const res = await call({ documentType, parties, jurisdiction: "QLD" });
      assert.equal(res.status, 409, `${documentType} / ${parties}`);
    }
  }
  assert.equal((await call({ documentType: "custom", parties: "Party A", specialInstructions: "[verify this]" })).status, 409);
  assert.ok(serverVerifyGate("x [  VERIFY", undefined, false));
  assert.equal(serverVerifyGate("Party A, verified", undefined, false), null);
});

test("review summary: a partly answered family trust election drops the template's yes / no", () => {
  const blank = parseForm("", T, true);
  const key = blank.find((f) => f.label === "Family trust election in place")!.key;
  const f = parseForm(setAnswer(T, T, key, "yes (specified individual: Jane Citizen) / no. Interposed entity elections: "), T, true);
  const s = groupSummary(f.filter((x) => x.group === "beneficiaries"));
  assert.equal(s, "yes (specified individual: Jane Citizen)");
  const f2 = parseForm(setAnswer(T, T, key, "yes (specified individual: ) / no. Interposed entity elections: Smith Pty Ltd"), T, true);
  assert.equal(groupSummary(f2.filter((x) => x.group === "beneficiaries")), "yes; Interposed entity elections: Smith Pty Ltd");
});
