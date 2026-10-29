import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCUMENT_TYPES, getDocumentType } from "../lib/lex-document-types";

const doc = getDocumentType("trust-distribution-resolution")!;
const all = () => [doc.description, ...doc.requiredElements, ...doc.draftingWarnings, ...(doc.draftingGuide ?? []), doc.partiesTemplate ?? ""].join("\n");

test("Trust Distribution Resolution is in the Trusts group of the dropdown", () => {
  assert.ok(doc, "registry entry exists");
  assert.equal(doc.name, "Trust Distribution Resolution");
  assert.equal(doc.category, "trust");
  assert.equal(DOCUMENT_TYPES.filter((d) => d.id === doc.id).length, 1);
});

test("checklist collects every field the resolution needs, defaulting to 30 June 2026", () => {
  const t = doc.partiesTemplate ?? "";
  for (const f of ["Trust name", "Trust deed date", "Trustee type", "Trustee name", "sign", "Financial year ending: 30 June 2026", "Date and place the resolution was made", "Beneficiaries and shares", "Capital gains", "Franked distributions", "Fallback beneficiary", "Family trust election"]) {
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
  assert.ok(view.includes("doc?.partiesTemplate") && view.includes("p.setParties(doc.partiesTemplate"));
});
