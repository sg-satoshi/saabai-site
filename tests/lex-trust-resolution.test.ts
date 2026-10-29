import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCUMENT_TYPES, getDocumentType, defaultFinancialYearEnd, fillPartiesTemplate } from "../lib/lex-document-types";

const doc = getDocumentType("trust-distribution-resolution")!;
const all = () => [doc.description, ...doc.requiredElements, ...doc.draftingWarnings, ...(doc.draftingGuide ?? []), doc.partiesTemplate ?? ""].join("\n");

test("Trust Distribution Resolution is in the Trusts group of the dropdown", () => {
  assert.ok(doc, "registry entry exists");
  assert.equal(doc.name, "Trust Distribution Resolution");
  assert.equal(doc.category, "trust");
  assert.equal(DOCUMENT_TYPES.filter((d) => d.id === doc.id).length, 1);
});

test("checklist collects every field the resolution needs", () => {
  const t = doc.partiesTemplate ?? "";
  for (const f of ["Trust name", "Trust deed date", "Trustee type", "Trustee name", "sign", "Financial year ending: 30 June {{FY_END}}", "Date, time and place the resolution was made", "who was present", "Vesting date", "governing law clause", "former spouse", "Beneficiaries and shares", "Capital gains", "Franked distributions", "Fallback beneficiary", "Family trust election"]) {
    assert.ok(t.includes(f), `checklist asks for ${f}`);
  }
});

test("covers current best practice: deadline, deed, s100A, streaming, Div 7A, FTE, TFN", () => {
  const s = all();
  for (const k of ["30 June", "31 August", "earlier date in the deed", "backdated", "definition of income", "s100A", "TR 2022/4", "PCG 2022/2", "s115-228", "s207-58", "Bendel [2026] HCA 18", "family trust distribution tax", "TFN", "default beneficiaries", "percentage", "vested"]) {
    assert.ok(s.includes(k), `mentions ${k}`);
  }
  const leg = doc.governingLegislation.flatMap((l) => l.keySections).join(" ");
  assert.ok(leg.includes("Subdiv 115-C") && leg.includes("Subdiv 207-B") && leg.includes("s100A"));
});

test("covers every trustee type and ends with the check-the-deed note", () => {
  const g = (doc.draftingGuide ?? []).join("\n");
  assert.ok(/sole director/.test(g) && /two or more directors/.test(g) && /individual/i.test(g));
  assert.ok(g.includes("must be checked against the trust deed and reviewed by your accountant or lawyer"));
  assert.ok(!/\u2014|\u2013/.test(all()), "no dashes");
});

test("drafting route sends the structure, and the view offers the checklist", () => {
  const route = readFileSync("app/api/lex-draft/route.ts", "utf8");
  assert.ok(route.includes("docType.draftingGuide") && route.includes("DOCUMENT STRUCTURE"));
  const view = readFileSync("app/lex/_components/Drafting.tsx", "utf8");
  assert.ok(view.includes("doc?.partiesTemplate") && view.includes("p.setParties(fillPartiesTemplate(doc.partiesTemplate"));
});

test("hardened against adversarial review: wording, authority, evidence, family law", () => {
  const s = all();
  for (const k of ["determines and appoints", "intends", "Bamford [2010] HCA 10", "the whole of", "net financial benefit", "s248B", "s248A", "quorum", "s191", "s251A", "s127 is not needed", "who was present", "ordinary family or commercial dealing", "actually", "not an admission", "former spouse", "governing law", "vesting date", "foreign person", "interposed entity", "consistent with the deed"]) {
    assert.ok(s.includes(k), `mentions ${k}`);
  }
  assert.ok(!/Shane|Goldberg/i.test(s), "generic, no personal data");
});

test("default financial year is the next 30 June, not hardcoded, and past years are framed as minutes", () => {
  assert.equal(defaultFinancialYearEnd(new Date("2026-10-29T05:00:00Z")), 2027);
  assert.equal(defaultFinancialYearEnd(new Date("2027-06-30T05:00:00Z")), 2027);
  assert.equal(defaultFinancialYearEnd(new Date("2027-06-30T15:00:00Z")), 2028, "Brisbane 1 July");
  assert.equal(defaultFinancialYearEnd(new Date("2027-01-15T00:00:00Z")), 2027);
  assert.ok(fillPartiesTemplate(doc.partiesTemplate!, new Date("2026-10-29T05:00:00Z")).includes("Financial year ending: 30 June 2027"));
  assert.ok(!/30 June 2026/.test(doc.partiesTemplate!), "no hardcoded year");
  const g = (doc.draftingGuide ?? []).join("\n");
  assert.ok(g.includes("minutes recording a decision genuinely made on or before that date"));
});

test("QA minors: post 30 June streaming caveat, TFN reporting change, corrected sections", () => {
  const s = all();
  assert.ok(s.includes("cannot be streamed after 30 June"));
  assert.ok(s.includes("s12-175") && s.includes("1 July 2026") && s.includes("2027"));
  const leg = doc.governingLegislation.flatMap((l) => l.keySections).join(" ");
  assert.ok(leg.includes("s271-105 beneficiary exclusion") && leg.includes("s202DL TFN withholding"));
});
