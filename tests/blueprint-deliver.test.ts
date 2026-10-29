/**
 * Blueprint review and deliver (#363): review gate only for portal buyers,
 * client sees delivered versions only, no URL in the list, copy rules.
 *
 *   npx tsx --test tests/blueprint-deliver.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canDeliver, deliveredReports, markReviewed, reviewRequired } from "../lib/portal-blueprint/deliver";
import { reportReadyEmail } from "../lib/portal-blueprint/emails";
import type { AuditReport } from "../lib/audit-types";

const OFF = {} as NodeJS.ProcessEnv;
const ALLOW = { BLUEPRINT_PORTAL_MODE: "allowlist", BLUEPRINT_PORTAL_ALLOW: "hello@saabai.ai" } as unknown as NodeJS.ProcessEnv;
const rep = (id: string, version: number, extra: Partial<AuditReport> = {}): AuditReport => ({ id, version, filename: `f${version}.docx`, url: `https://blob.example/${id}`, generatedAt: "2026-10-30T00:00:00Z", ...extra });

test("flag off: delivery works without review, exactly as today", () => {
  const e = { contactEmail: "client@x.com", reports: [rep("a", 1)] };
  assert.equal(reviewRequired(e, OFF), false);
  assert.deepEqual(canDeliver(e, "a", OFF), { ok: true });
  assert.equal(canDeliver(e, "missing", OFF).ok, false);
});

test("portal buyer: delivery needs a reviewed version", () => {
  const e = { contactEmail: "hello@saabai.ai", reports: [rep("a", 1)] };
  assert.equal(reviewRequired(e, ALLOW), true);
  const c = canDeliver(e, "a", ALLOW);
  assert.equal(c.ok, false);
  if (!c.ok) assert.equal(c.status, 409);
  const reviewed = markReviewed(e.reports, "a", "2026-10-30T01:00:00Z")!;
  assert.equal(reviewed[0].reviewedAt, "2026-10-30T01:00:00Z");
  assert.deepEqual(canDeliver({ ...e, reports: reviewed }, "a", ALLOW), { ok: true });
  // Not on the allowlist: old flow.
  assert.equal(reviewRequired({ contactEmail: "other@x.com" }, ALLOW), false);
});

test("markReviewed keeps the first review time and rejects unknown ids", () => {
  const r = [rep("a", 1, { reviewedAt: "2026-10-01T00:00:00Z" })];
  assert.equal(markReviewed(r, "a")![0].reviewedAt, "2026-10-01T00:00:00Z");
  assert.equal(markReviewed(r, "zzz"), null);
});

test("client sees delivered versions only, newest first, with no URL", () => {
  const e = { reports: [rep("a", 1, { deliveredAt: "2026-10-20T00:00:00Z" }), rep("b", 2), rep("c", 3, { deliveredAt: "2026-10-29T00:00:00Z" })] };
  const list = deliveredReports(e);
  assert.deepEqual(list.map((r) => r.id), ["c", "a"]);
  assert.ok(list.every((r) => !("url" in r)));
});

test("ready email: escaped name, no em dash, no free claim, no price", () => {
  const m = reportReadyEmail({ name: "<b>Jo</b> Smith", tierName: "Starter", portalUrl: "https://saabai.ai/portal/x" });
  const all = JSON.stringify(m);
  assert.ok(!m.html.includes("<b>Jo</b>"));
  assert.ok(!/\u2014/.test(all));
  assert.ok(!/\bfree\b/i.test(all));
  assert.ok(!/\$\d/.test(all));
  assert.ok(all.includes("https://saabai.ai/portal/x"));
  assert.ok(m.text.includes("saabai.ai/portal/login"));
});
