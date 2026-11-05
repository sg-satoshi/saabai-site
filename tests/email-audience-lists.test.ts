/** Static smart lists for targeted broadcasts. No network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanListIds, listCampaignName, MAX_LIST } from "../lib/email/contact-admin";
import { mailableContacts } from "../lib/email/rules";

const A = "11111111-2222-4333-8444-555555555555";
const B = "22222222-3333-4444-8555-666666666666";

test("cleanListIds: dedupe, uuid only, capped", () => {
  const r = cleanListIds([A, A, B]);
  assert.ok(r.ok && r.ids.length === 2);
  assert.equal(cleanListIds([]).ok, false);
  assert.equal(cleanListIds(["not-a-uuid"]).ok, false);
  assert.equal(cleanListIds(Array.from({ length: MAX_LIST + 1 }, (_, i) => `11111111-2222-4333-8444-${String(i).padStart(12, "0")}`)).ok, false);
});

test("listCampaignName uses the selected count", () => {
  assert.match(listCampaignName(3, new Date("2026-11-05T02:00:00Z")), /^Selected 3 ·/);
  assert.equal(listCampaignName(1).length <= 120, true);
});

test("list audience: only confirmed subscribed non-suppressed are eligible", () => {
  const selected = [
    { email: "a@x.com", status: "subscribed", confirmedAt: "2026-01-01" },
    { email: "b@x.com", status: "pending", confirmedAt: null },
    { email: "c@x.com", status: "unsubscribed", confirmedAt: "2026-01-01" },
    { email: "d@x.com", status: "subscribed", confirmedAt: "2026-01-01" },
    { email: "e@x.com", status: "bounced", confirmedAt: "2026-01-01" },
    { email: "f@x.com", status: "complained", confirmedAt: "2026-01-01" },
  ];
  const gate = mailableContacts(selected, new Set(["d@x.com"]));
  assert.equal(gate.recipients.length, 1);
  assert.equal(gate.recipients[0].email, "a@x.com");
  assert.equal(gate.held, 4); // pending + unsub + bounce + complaint (suppressed counted separately)
  assert.equal(gate.suppressed, 1);
});

test("migration 018 is idempotent and channel-agnostic", () => {
  const sql = readFileSync("db/migrations/018_audience_lists.sql", "utf8");
  assert.match(sql, /create table if not exists audience_lists/);
  assert.match(sql, /create table if not exists audience_list_members/);
  assert.match(sql, /add column if not exists list_id/);
  assert.match(sql, /on delete cascade/);
  assert.match(sql, /on delete restrict/);
  assert.match(sql, /kind in \('static'\)/);
  assert.match(sql, /Apply by hand/);
  assert.match(sql, /Safe to re-run/);
  assert.doesNotMatch(sql, /create table.*sms/i);
  assert.match(sql, /channel-agnostic/);
  assert.match(sql, /revoke all on audience_lists, audience_list_members from anon, authenticated/);
});

test("ops and UI wire Send email to a list-backed draft", () => {
  const ops = readFileSync("lib/email/ops.ts", "utf8");
  assert.match(ops, /export async function createListCampaign/);
  assert.match(ops, /audienceNow\(ready\.db, ready\.tenant\.id, row\.list_id/);
  assert.match(ops, /from\("audience_list_members"\)\.delete\(\)/);
  const route = readFileSync("app/api/admin/email/route.ts", "utf8");
  assert.match(route, /action === "createListCampaign"/);
  assert.match(route, /cleanListIds/);
  const ui = readFileSync("app/saabai-admin/email/subscribers/Subscribers.tsx", "utf8");
  assert.match(ui, /Send email/);
  assert.match(ui, /createListCampaign/);
  assert.match(ui, /Select all shown/);
  const composer = readFileSync("app/saabai-admin/email/Composer.tsx", "utf8");
  assert.match(composer, /Smart list \(static selection\)/);
  assert.match(composer, /eligible now/);
});
