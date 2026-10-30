import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ACN, ABN, LEGAL_NAME, TRADING_AS, entityIds, entityLegalLine, entitySender, abnDigits } from "../lib/entity";
import { NAP, organizationSchema } from "../lib/seo-entity";
import { LEX_TERMS } from "../lib/lex-terms";

/** Fails if "ACN" or "ABN" appears without a number straight after it. */
function assertNoBareIds(s: string, where: string) {
  for (const label of ["ACN", "ABN"]) {
    const re = new RegExp(`\\b${label}\\b(?!\\s*:?\\s*\\d)`, "g");
    assert.equal(re.test(s), false, `${where}: "${label}" rendered without a value in: ${s}`);
  }
  assert.doesNotMatch(s, /X{3}|TBC|TBA|\[ACN\]|\[ABN\]|placeholder/i, `${where}: placeholder text`);
}

test("entity names are the company", () => {
  assert.equal(LEGAL_NAME, "Saabai Pty Ltd");
  assert.equal(TRADING_AS, "Saabai");
  assert.equal(NAP.legalName, LEGAL_NAME);
});

test("no ACN/ABN text renders while the numbers are empty", () => {
  const lines = [entityIds(), entityLegalLine(), entitySender(), ...LEX_TERMS.map((t) => t.body)];
  for (const l of lines) assertNoBareIds(l, "helper");
  if (!ACN && !ABN) {
    assert.equal(entityIds(), "");
    assert.equal(entityLegalLine(), "Saabai Pty Ltd, trading as Saabai");
    const org = organizationSchema["@graph"][0] as Record<string, unknown>;
    assert.equal(org.taxID, undefined);
    assert.equal(org.identifier, undefined);
  }
});

test("numbers drop in as one-line changes", () => {
  assert.equal(entityIds("123 456 789", ""), "ACN 123 456 789");
  assert.equal(entityIds("", "12 345 678 901"), "ABN 12 345 678 901");
  assert.equal(entityLegalLine("123 456 789", "12 345 678 901"), "Saabai Pty Ltd (ACN 123 456 789, ABN 12 345 678 901), trading as Saabai");
  assert.equal(abnDigits("12 345 678 901"), "12345678901");
  for (const l of [entityLegalLine("123 456 789", ""), entitySender("", "12 345 678 901")]) assertNoBareIds(l, "filled");
});

test("old sole-trader wording and ABN are gone from rendered sources", () => {
  const roots = ["app", "lib", "public/llms.txt", "public/llms-full.txt"];
  const files: string[] = [];
  const walk = (p: string) => {
    if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f)); }
    else if (/\.(tsx?|txt)$/.test(p)) files.push(p);
  };
  roots.forEach(walk);
  for (const f of files) {
    if (/app\/sites\/|lib\/lex-privacy\/|lmm|nico/.test(f)) continue; // client sites, PII detectors
    const s = readFileSync(f, "utf8");
    assert.doesNotMatch(s, /71 ?889 ?082 ?572/, `${f}: old sole-trader ABN`);
    assert.doesNotMatch(s, /sole trader business operated by|operates it as a sole trader/, `${f}: sole-trader wording`);
    // JSX like "ABN {x}" or "ACN {x}" must go through lib/entity helpers.
    assert.doesNotMatch(s, /\b(ACN|ABN) \{(NAP|MY_INFO|EMAIL_BRAND)\./, `${f}: bare ACN/ABN label`);
  }
});

// ── GST flag, footer and issuer address ─────────────────────────────────────
import { gstCopy, gstOf, GST_REGISTERED, issuerAddress, ENTITY_ADDRESS } from "../lib/entity";
import { execFileSync } from "node:child_process";

test("GST_REGISTERED defaults to false and keeps the live wording", () => {
  assert.equal(GST_REGISTERED, false);
  const g = gstCopy(false);
  assert.equal(g.pricesLine, "Prices in AUD. GST not applicable.");
  assert.equal(g.pricePhrase, "AUD, GST not applicable");
  assert.equal(g.invoiceTitle, "INVOICE");
  assert.match(g.terms, /not registered for GST/);
  assert.equal(gstOf(299, false), 0);
});

test("GST_REGISTERED true uses the exact GST-inclusive copy", () => {
  const g = gstCopy(true);
  assert.equal(g.pricesLine, "Prices in AUD and include GST.");
  assert.equal(`$299 a month (${g.pricePhrase})`, "$299 a month (AUD, including GST)");
  assert.equal(g.terms, "All prices are in Australian dollars and include GST unless stated otherwise.");
  assert.match(g.offerSuffix, /Includes GST/);
  assert.equal(g.invoiceTitle, "TAX INVOICE");
  assert.equal(gstOf(299, true), 27.18);
  assert.equal(gstOf(1100, true), 100);
});

test("no hard-coded 'GST not applicable' left outside lib/entity", () => {
  const out = execFileSync("bash", ["-c", "grep -rln 'GST not applicable\\|GST is not applicable' app lib --include=*.ts --include=*.tsx | grep -v -E '^(lib/entity.ts|lib/mia-offers.ts|lib/audit-report.ts|lib/website-tiers.ts|lib/blueprint.ts|lib/billing/emails.ts|app/saabai-admin/plans/PlansClient.tsx|app/client-portal/upgrades/UpgradesPanel.tsx|app/components/billing/SetupBillingModal.tsx)$' || true"]).toString().trim();
  assert.equal(out, "", `unrouted GST wording in: ${out}`);
});

test("mobile/site footer copyright is just the legal name; full line stays on legal pages", () => {
  const footer = readFileSync("app/components/sb/SbFooter.tsx", "utf8");
  assert.match(footer, /© 2026 \{LEGAL_NAME\}/);
  assert.doesNotMatch(footer, /entityLegalLine/);
  for (const f of ["app/components/LegalDocument.tsx", "app/contact/page.tsx", "lib/invoice-send.ts"]) {
    assert.match(readFileSync(f, "utf8"), /entityLegalLine|entityIds/, f);
  }
});

test("issuer address placeholder never renders and check-entity catches it", () => {
  assert.equal(issuerAddress("ADDRESS_PENDING"), "");
  assert.equal(issuerAddress("1 Example St, Brisbane QLD 4000"), "1 Example St, Brisbane QLD 4000");
  if (ENTITY_ADDRESS === "ADDRESS_PENDING") {
    assert.throws(() => execFileSync("node", ["scripts/check-entity.mjs"], { stdio: "pipe" }));
  }
});
