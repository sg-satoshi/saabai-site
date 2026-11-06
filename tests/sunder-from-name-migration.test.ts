import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUNDER_FROM_NAME } from "../lib/email/constants";

const sql = readFileSync("db/migrations/010_sunder_from_name.sql", "utf8");

test("010 renames the sunder tenant and campaigns to Sunder Pickleball", () => {
  assert.equal(SUNDER_FROM_NAME, "SUNDER Pickleball"); // default changed in 016
  assert.match(sql, /update email_tenants set from_name = 'Sunder Pickleball'\s+where slug = 'sunder' and from_name = 'SUNDER'/);
  assert.match(sql, /update email_campaigns c set from_name = 'Sunder Pickleball'/);
  assert.doesNotMatch(sql, /\b(drop|delete|truncate|alter)\b/i);
});

test("016 sets SUNDER Pickleball on the tenant and unsent campaigns only", () => {
  const s = readFileSync("db/migrations/016_sunder_from_name_caps.sql", "utf8");
  assert.match(s, /update email_tenants set from_name = 'SUNDER Pickleball'\s+where slug = 'sunder'/);
  assert.match(s, /c\.status in \('draft', 'scheduled'\)/);
  assert.doesNotMatch(s, /\b(drop|delete|truncate|alter)\b/i);
});
