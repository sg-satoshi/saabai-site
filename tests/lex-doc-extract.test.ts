/**
 * Lex supporting documents: reading files, merging facts across files, prefilling the checklist,
 * "What you'll need" ticks and saved progress. Synthetic fixtures only, no real people, no AI calls.
 *   npx tsx --test tests/lex-doc-extract.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getDocumentType, fillPartiesTemplate, DOCUMENT_TYPES } from "../lib/lex-document-types";
import { mergeFacts, profileFor, prefillChecklist, fieldsFromTemplate, parseDocDate, TRUST_DEED_PROFILE, extractSystem, type FileFacts } from "../lib/lex-doc-extract";
import { readDocText } from "../lib/lex-doc-text";
import { needsFor, needDone } from "../lib/lex-doc-needs";
import { parseProgress, hasProgress, progressKey, PROGRESS_TTL_MS } from "../lib/lex-draft-progress";

const trustDoc = getDocumentType("trust-distribution-resolution")!;
const fixture = readFileSync("tests/fixtures/synthetic-trust-deed.txt", "utf8");

async function pdf(pages: string[]): Promise<Buffer> {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (const t of pages) {
    const pg = d.addPage();
    t.split("\n").forEach((line, i) => line && pg.drawText(line, { x: 50, y: 750 - i * 16, size: 11, font }));
  }
  return Buffer.from(await d.save());
}

const deed: FileFacts = {
  kind: "deed", documentDate: "1 March 2005", title: "Trust deed",
  fields: [
    { key: "trustName", value: "Example Family Trust", clause: "Recital A", page: 1, sure: true },
    { key: "governingLaw", value: "South Australia", clause: "cl 30", page: 9, sure: true },
    { key: "vestingDate", value: "80 years from the date of this deed", clause: "cl 1.1(z)", page: 2, sure: true },
    { key: "incomeDefinition", value: "accounting income", clause: "cl 1.1(k)", page: 2, sure: true },
    { key: "trusteeName", value: "Original Trustee Pty Ltd", clause: "Schedule item 2", page: 10, sure: true },
    { key: "clauseResolutionDeadline", value: "cl 6.2, by 30 June", clause: "cl 6.2", page: 4, sure: false },
  ],
};
const variation: FileFacts = {
  kind: "variation", documentDate: "15 August 2018", title: "Deed of variation",
  fields: [
    { key: "incomeDefinition", value: "net income under s95, or as the trustee determines", clause: "cl 3", page: 1, sure: true, amends: true },
    { key: "trustName", value: "Example Family Trust", clause: "Recital", page: 1, sure: true, amends: false },
  ],
};
const asic: FileFacts = { kind: "asic-extract", documentDate: "2 July 2026", fields: [{ key: "trusteeAcn", value: "000 000 019", sure: true }, { key: "trusteeName", value: "Original Trustee Pty Ltd", sure: true }] };

test("synthetic fixture has no personal data markers", () => {
  assert.match(fixture, /SYNTHETIC TEST DEED/);
  assert.ok(!/\b\d{3} \d{3} \d{3}\b/.test(fixture.replace("000 000 019", "")), "no real-looking numbers");
});

test("reads text PDFs with page numbers, and flags a scanned PDF", async () => {
  const t = await readDocText("deed.pdf", await pdf(["SYNTHETIC TEST DEED", "1.1 Income means the income of the trust"]));
  assert.equal(t.pages, 2);
  assert.equal(t.scanned, false);
  assert.match(t.text, /\[Page 2\]\n1\.1 Income/);
  const scan = await readDocText("scan.pdf", await pdf(["", ""]));
  assert.equal(scan.scanned, true);
  const txt = await readDocText("deed.txt", Buffer.from(fixture));
  assert.match(txt.text, /Example Family Trust/);
  await assert.rejects(readDocText("deed.exe", Buffer.from("x")));
});

test("later variation overrides the deed and shows what it replaced", () => {
  const m = mergeFacts([{ file: "deed.pdf", facts: deed }, { file: "variation-2018.pdf", facts: variation }], TRUST_DEED_PROFILE);
  const inc = m.fields.find((f) => f.key === "incomeDefinition")!;
  assert.match(inc.value, /net income/);
  assert.equal(inc.source?.file, "variation-2018.pdf");
  assert.equal(inc.replaced?.[0].value, "accounting income");
  assert.equal(inc.verify, false);
  assert.equal(inc.confidence, "high");
  assert.deepEqual(m.variations.map((v) => v.file), ["variation-2018.pdf"]);
});

test("the latest of two variations wins, whatever the upload order", () => {
  const v2: FileFacts = { kind: "variation", documentDate: "1 July 2022", fields: [{ key: "incomeDefinition", value: "as the trustee determines", clause: "cl 2", page: 1, sure: true, amends: true }] };
  const m = mergeFacts([{ file: "v2022.pdf", facts: v2 }, { file: "deed.pdf", facts: deed }, { file: "v2018.pdf", facts: variation }]);
  assert.equal(m.fields.find((f) => f.key === "incomeDefinition")!.source?.file, "v2022.pdf");
});

test("ACN prefers the ASIC extract; unsure or missing fields are marked Verify", () => {
  const m = mergeFacts([{ file: "deed.pdf", facts: deed }, { file: "asic.pdf", facts: asic }]);
  const acn = m.fields.find((f) => f.key === "trusteeAcn")!;
  assert.equal(acn.source?.file, "asic.pdf");
  assert.equal(acn.verify, false);
  const dl = m.fields.find((f) => f.key === "clauseResolutionDeadline")!;
  assert.equal(dl.verify, true);
  assert.match(dl.why!, /not sure/);
  const fte = m.fields.find((f) => f.key === "familyTrustElection")!;
  assert.equal(fte.value, "");
  assert.equal(fte.confidence, "none");
});

test("files that disagree with no variation are marked Verify", () => {
  const other: FileFacts = { kind: "minutes", documentDate: "30 June 2025", fields: [{ key: "trusteeName", value: "Different Trustee Pty Ltd", clause: "Minute 1", sure: true }] };
  const m = mergeFacts([{ file: "deed.pdf", facts: deed }, { file: "minutes.pdf", facts: other }]);
  const t = m.fields.find((f) => f.key === "trusteeName")!;
  assert.equal(t.verify, true);
  assert.match(t.why!, /disagree/);
});

test("prefill writes the deed lines with source and Verify, and leaves the decision lines alone", () => {
  const tpl = fillPartiesTemplate(trustDoc.partiesTemplate!, new Date("2026-10-29T00:00:00Z"));
  const m = mergeFacts([{ file: "deed.pdf", facts: deed }, { file: "variation-2018.pdf", facts: variation }, { file: "asic.pdf", facts: asic }]);
  const out = prefillChecklist(tpl, m);
  assert.match(out, /^Trust name: Example Family Trust \(from /m);
  assert.match(out, /Variations: 15 August 2018 \(variation-2018\.pdf\)/);
  assert.match(out, /ACN 000 000 019 \(from asic\.pdf\)/);
  assert.match(out, /Family trust election in place\? \[VERIFY: not found/);
  assert.match(out, /resolution deadline: cl 6\.2, by 30 June \(from deed\.pdf, cl 6\.2, p 4\) \[VERIFY/);
  assert.match(out, /^Financial year ending: 30 June 2027/m);
  assert.match(out, /^Beneficiary classes under the deed:/m);
  assert.ok(!/[\u2012-\u2015]/.test(out));
});

test("generic: every Draft Documents type gets a profile with fields and the right label", () => {
  for (const d of DOCUMENT_TYPES) {
    const p = profileFor(d);
    assert.ok(p.fields.length > 0, d.id);
    assert.equal(p.uploadLabel, d.category === "trust" ? "Upload Trust Deed or supporting documents" : "Upload supporting documents", d.id);
    assert.ok(extractSystem(p).includes(p.fields[0].key));
  }
  assert.equal(profileFor(undefined).uploadLabel, "Upload supporting documents");
  const keys = fieldsFromTemplate("Party A: \nParty B (ACN): \n  1. \nGoverning law? yes / no").map((f) => f.label);
  assert.deepEqual(keys, ["Party A", "Party B (ACN)", "Governing law"]);
});

test("generic prefill adds extracted facts under a heading", () => {
  const facts: FileFacts = { kind: "agreement", documentDate: "1 May 2024", fields: [{ key: "parties", value: "Alpha Pty Ltd and Beta Pty Ltd", clause: "Parties", page: 1, sure: true }] };
  const p = profileFor(getDocumentType("discretionary-trust-deed"));
  const out = prefillChecklist("", mergeFacts([{ file: "old.pdf", facts }], p));
  assert.match(out, /From the uploaded documents \(check each line\):\nParties \(names, ABN or ACN, roles\): Alpha Pty Ltd and Beta Pty Ltd \(from old\.pdf, Parties, p 1\)/);
});

test("What you'll need ticks from uploads, filled lines and manual ticks", () => {
  const needs = needsFor("trust-distribution-resolution", "trust");
  assert.ok(needs.some((n) => /deed/i.test(n.label)) && needs.some((n) => /ASIC/.test(n.label)) && needs.some((n) => /Family trust election/.test(n.label)));
  const tpl = fillPartiesTemplate(trustDoc.partiesTemplate!);
  const m = mergeFacts([{ file: "deed.pdf", facts: deed }, { file: "asic.pdf", facts: asic }]);
  const st = { extracted: m, parties: tpl, template: tpl, manual: [] as string[] };
  assert.equal(needDone(needs.find((n) => n.id === "deed")!, st), true);
  assert.equal(needDone(needs.find((n) => n.id === "asic")!, st), true);
  assert.equal(needDone(needs.find((n) => n.id === "when")!, st), false);
  const filled = tpl.replace(/^Date, time and place.*$/m, "Date, time and place the resolution was made, and who was present: 30 June 2026, 4 PM, Adelaide");
  assert.equal(needDone(needs.find((n) => n.id === "when")!, { ...st, parties: filled }), true);
  assert.equal(needDone(needs.find((n) => n.id === "minutes")!, { ...st, manual: ["minutes"] }), true);
  for (const d of DOCUMENT_TYPES) assert.ok(needsFor(d.id, d.category).length >= 3, d.id);
});

test("saved progress: per user, expires after 30 days, ignores junk", () => {
  assert.equal(progressKey(null), null);
  assert.equal(progressKey("A@Firm.test"), "lex_draft_progress_a@firm.test");
  const now = Date.now();
  const p = { v: 1, savedAt: now, typeId: "trust-distribution-resolution", jurisdiction: "South Australia (SA)", parties: "Trust name: X", instructions: "", prep: { extracted: null, manual: ["deed"] } };
  assert.deepEqual(parseProgress(JSON.stringify(p), now)?.prep.manual, ["deed"]);
  assert.equal(parseProgress(JSON.stringify({ ...p, savedAt: now - PROGRESS_TTL_MS - 1 }), now), null);
  assert.equal(parseProgress("{nope", now), null);
  assert.equal(hasProgress({ ...p, parties: " ", prep: { extracted: null, manual: [] } }), false);
  assert.equal(hasProgress(p), true);
});

test("dates parse in the common deed formats", () => {
  assert.equal(parseDocDate("15 August 2018"), Date.UTC(2018, 7, 15));
  assert.equal(parseDocDate("15th day of August, 2018"), Date.UTC(2018, 7, 15));
  assert.equal(parseDocDate("15/08/2018"), Date.UTC(2018, 7, 15));
  assert.ok(Number.isNaN(parseDocDate("sometime")));
});

test("route: privacy gateway, size limits, nothing stored, no TFN asked for", () => {
  const src = readFileSync("app/api/lex-doc-extract/route.ts", "utf8");
  assert.match(src, /LexGateway\.open\(\{ route: "lex-doc-extract"/);
  assert.match(src, /kind: "firm"/);
  assert.match(src, /gw\.mask\(r\.text\)/);
  assert.match(src, /maxFileBytes/);
  assert.ok(!/redis|kv\.|put\(|writeFile|setItem/i.test(src), "no storage");
  const prompt = extractSystem(TRUST_DEED_PROFILE);
  assert.match(prompt, /Never include tax file numbers/);
  const proxy = readFileSync("proxy.ts", "utf8");
  assert.ok(!proxy.includes('"/api/lex-doc-extract"'), "not on the public list");
});
