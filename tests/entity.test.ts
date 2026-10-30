import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTITY_ABN, ENTITY_ACN, ENTITY_LINE, ENTITY_NAME } from "../lib/entity";
import { NAP } from "../lib/seo-entity";

test("entity line uses the company format", () => {
  assert.equal(ENTITY_NAME, "Saabai Pty Ltd");
  assert.equal(ENTITY_LINE, `Saabai Pty Ltd (ACN ${ENTITY_ACN}) trading as Saabai`);
  assert.equal(NAP.abn, ENTITY_ABN);
  assert.equal(NAP.legalName, ENTITY_NAME);
});

test("ACN and ABN are real, not placeholders (fails until Shane's ACN/ABN are filled in)", () => {
  assert.match(ENTITY_ACN, /^\d{3} \d{3} \d{3}$/, "ENTITY_ACN must be 'xxx xxx xxx'");
  assert.match(ENTITY_ABN, /^\d{2} \d{3} \d{3} \d{3}$/, "ENTITY_ABN must be 'xx xxx xxx xxx'");
});
