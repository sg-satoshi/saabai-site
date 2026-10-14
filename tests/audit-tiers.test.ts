import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAuditTier, isAuditTierInput, AUDIT_TIER_LABELS } from "../lib/audit-types";
import { questionsForTier } from "../lib/audit-factfind";
import { TIERS } from "../lib/blueprint";

test("legacy AI Audit tiers map to Blueprint tiers", () => {
  assert.equal(normalizeAuditTier("essential"), "starter");
  assert.equal(normalizeAuditTier("professional"), "pro");
  assert.equal(normalizeAuditTier("enterprise"), "business");
  assert.equal(normalizeAuditTier("pro"), "pro");
  assert.equal(normalizeAuditTier("bogus"), "starter");
  assert.equal(normalizeAuditTier(undefined), "starter");
});

test("tier input validation accepts current and legacy only", () => {
  for (const t of ["starter", "pro", "business", "essential", "professional", "enterprise"]) assert.ok(isAuditTierInput(t));
  assert.ok(!isAuditTierInput("gold"));
});

test("no retired prices in tier labels", () => {
  const labels = Object.values(AUDIT_TIER_LABELS).join(" ");
  assert.ok(!/7,500|15,000/.test(labels));
  assert.match(labels, /\$497/);
});

test("Blueprint tiers map to engine tiers and fact-find depth grows", () => {
  assert.equal(TIERS.starter.engineTier, "starter");
  assert.equal(TIERS.pro.engineTier, "pro");
  assert.equal(TIERS.business.engineTier, "business");
  const n = (t: "starter" | "pro" | "business") => questionsForTier(t, "other").length;
  assert.ok(n("starter") > 0 && n("starter") < n("pro") && n("pro") < n("business"));
});
