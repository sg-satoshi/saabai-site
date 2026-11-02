import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUNDER_FROM_NAME } from "../lib/email/constants";

const sql = readFileSync("db/migrations/010_sunder_from_name.sql", "utf8");

test("010 renames the sunder tenant and campaigns to Sunder Pickleball", () => {
  assert.equal(SUNDER_FROM_NAME, "Sunder Pickleball");
  assert.match(sql, /update email_tenants set from_name = 'Sunder Pickleball'\s+where slug = 'sunder' and from_name = 'SUNDER'/);
  assert.match(sql, /update email_campaigns c set from_name = 'Sunder Pickleball'/);
  assert.doesNotMatch(sql, /\b(drop|delete|truncate|alter)\b/i);
});
