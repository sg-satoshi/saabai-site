/**
 * Lex privacy Phase 3: AU identifiers with checksums, phones and addresses.
 *   npx tsx --test tests/lex-privacy-p3-ids.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuPhone, isValidABN, isValidACN, isValidMedicare, isValidTFN } from "../lib/lex-privacy/au-ids";
import { tokenizePII } from "../lib/pii-scanner";
import { LexMasker } from "../lib/lex-privacy/mask";

const masked = (t: string) => tokenizePII(t);
const values = (t: string) => Object.values(masked(t).tokenMap);
const types = (t: string) => masked(t).stats.types;

test("checksums: known valid and invalid identifiers", () => {
  assert.ok(isValidABN("53 004 085 616"));
  assert.ok(isValidABN("51824753556"));
  assert.ok(!isValidABN("12 345 678 901"));
  assert.ok(isValidACN("004 085 616"));
  assert.ok(isValidACN("000 000 019"));
  assert.ok(!isValidACN("123 456 789"));
  assert.ok(isValidTFN("123 456 782"));
  assert.ok(isValidTFN("876 543 210"));
  assert.ok(!isValidTFN("123 456 789"));
  assert.ok(!isValidTFN("111 111 111"));
  assert.ok(isValidMedicare("2123 45670 1"));
  assert.ok(!isValidMedicare("2123 45671 1"));
  assert.ok(isAuPhone("0491 570 156") && isAuPhone("(07) 5555 1234") && isAuPhone("+61 7 5555 1234") && isAuPhone("1800 123 456"));
  assert.ok(!isAuPhone("0123 456 789"));
});

test("valid identifiers are masked with their type", () => {
  const t = "ABN 53 004 085 616, ACN 004 085 616, TFN 123 456 782, Medicare 2123 45670 1, BSB 064-000 account 12345678.";
  const ty = types(t);
  for (const k of ["ABN", "ACN", "TFN", "MEDICARE", "BSB", "ACCOUNT"]) assert.equal(ty[k], 1, k);
  assert.ok(!/\d{3}/.test(masked(t).tokenized.replace(/\{\{[A-Z]+_\d+\}\}/g, "")));
});

test("unlabelled numbers that fail checksums are left alone (fewer false positives)", () => {
  const t = "Invoice 12345678901, case number 123 456 789, [2019] HCA 12, (2001) 205 CLR 507, $1,250,000 on 12 March 2024, s 13 12 34.";
  assert.deepEqual(values(t), []);
});

test("labelled numbers that fail a checksum are still masked as ID (typos never leak)", () => {
  const r = masked("ABN 12 345 678 901 and TFN 123 456 789 and driver licence number 12345678");
  assert.equal(r.stats.types.ID, 3);
  assert.ok(!r.tokenized.includes("12 345 678 901") && !r.tokenized.includes("123 456 789") && !r.tokenized.includes("12345678"));
});

test("phones: real AU ranges only", () => {
  const r = masked("Call 0491 570 156, (07) 5555 1234, +61 7 5555 1234 or 1300 123 456. Ref 0123 456 789.");
  assert.equal(r.stats.types.PHONE, 4);
  assert.ok(r.tokenized.includes("0123 456 789"));
});

test("addresses, PO boxes and localities", () => {
  const r = masked("She lives at Unit 4/12 Smith Street, Southport QLD 4215. Post to PO Box 77 Merrimac QLD 4226. Office in Robina QLD 4226, and QLD 4000.");
  assert.equal(r.stats.types.ADDRESS, 3);
  assert.equal(r.stats.types.POSTCODE, 1);
  for (const v of ["Smith Street", "Southport", "PO Box 77", "Merrimac", "Robina", "4215", "4000"]) assert.ok(!r.tokenized.includes(v), v);
});

test("legal text is not over masked", () => {
  const t = "Under section 180 of the Corporations Act 2001 (Cth) and Part 5.3A, the Federal Court in Queensland held the duty applies.";
  assert.equal(masked(t).tokenized, t);
});

test("LexMasker: new identifiers round trip and never stay in the payload", () => {
  const m = new LexMasker();
  const t = "TFN 123 456 782, Medicare 2123 45670 1, BSB 064-000 account 12345678, 4/12 Smith Street, Southport QLD 4215";
  const out = m.mask(t);
  for (const v of ["123 456 782", "2123 45670 1", "064-000", "12345678", "Smith Street"]) assert.ok(!out.includes(v), v);
  assert.equal(m.rehydrate(out), t);
});
