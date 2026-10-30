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
