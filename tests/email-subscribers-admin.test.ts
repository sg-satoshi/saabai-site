/** SUNDER subscribers admin: edit and delete rules. No network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanDeleteIds, deleteConfirmText, editLocked, MAX_DELETE, validateContactEdit } from "../lib/email/contact-admin";

const ID = "11111111-2222-4333-8444-555555555555";

test("edit: valid input is cleaned", () => {
  const r = validateContactEdit({ id: ID, email: " Sam@Example.com ", firstName: " Sam ", mobile: "0412 345 678", status: "keep" });
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.edit.email, "sam@example.com"); assert.equal(r.edit.firstName, "Sam"); assert.equal(r.edit.unsubscribe, false); }
});

test("edit: bad email, bad id and re-subscribe are refused", () => {
  const bad = validateContactEdit({ id: ID, email: "a@b, c@d.com" });
  assert.ok(!bad.ok && bad.fields?.email);
  assert.equal(validateContactEdit({ id: "x", email: "a@b.com" }).ok, false);
  const sub = validateContactEdit({ id: ID, email: "a@b.com", status: "subscribed" });
  assert.ok(!sub.ok && sub.fields?.status);
  const un = validateContactEdit({ id: ID, email: "a@b.com", status: "unsubscribed" });
  assert.ok(un.ok && un.edit.unsubscribe);
});

test("edit: blank mobile clears, junk mobile is an error", () => {
  const blank = validateContactEdit({ id: ID, email: "a@b.com", mobile: "" });
  assert.ok(blank.ok && blank.edit.mobile === null);
  const junk = validateContactEdit({ id: ID, email: "a@b.com", mobile: "call me" });
  assert.ok(!junk.ok && junk.fields?.mobile);
});

test("delete ids: dedupe, uuid only, capped", () => {
  const r = cleanDeleteIds([ID, ID]);
  assert.ok(r.ok && r.ids.length === 1);
  assert.equal(cleanDeleteIds([]).ok, false);
  assert.equal(cleanDeleteIds(["1; drop table"]).ok, false);
  assert.equal(cleanDeleteIds(Array.from({ length: MAX_DELETE + 1 }, (_, i) => `11111111-2222-4333-8444-${String(i).padStart(12, "0")}`)).ok, false);
});

test("confirm text states the exact count", () => {
  assert.match(deleteConfirmText(1), /^Delete 1 subscriber\?/);
  assert.match(deleteConfirmText(7), /^Delete 7 subscribers\?/);
  assert.match(deleteConfirmText(7), /cancels any email still queued/);
});

test("suppressed rows are read only", () => {
  assert.equal(editLocked("bounced", false), true);
  assert.equal(editLocked("subscribed", true), true);
  assert.equal(editLocked("pending", false), false);
});

test("route and ops wire admin auth, logging and send cancellation", () => {
  const route = readFileSync("app/api/admin/email/route.ts", "utf8");
  assert.match(route, /requireAdminSession/);
  assert.match(route, /action === "deleteContacts"/);
  assert.match(route, /addChangeLogEntry/);
  const ops = readFileSync("lib/email/ops.ts", "utf8");
  const del = ops.slice(ops.indexOf("export async function deleteContacts"));
  const order = ["contact_deleted", "contact_id: null", "email_series_enrolments", 'from("email_contacts").delete()'].map((s) => del.indexOf(s));
  assert.ok(order.every((i) => i > 0), "all steps present");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "cancel, detach, unenrol, then delete");
  const ui = readFileSync("app/saabai-admin/email/subscribers/Subscribers.tsx", "utf8");
  assert.match(ui, /Select all shown/);
  assert.match(ui, /selected<\/b>/);
  assert.doesNotMatch(ui, /contact-admin"/, "client must not import server rules");
});
