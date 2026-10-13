import { test } from "node:test";
import assert from "node:assert/strict";
import { isLiveBlueprintEngagement, summariseRevenue, revenueBreakdownLabel } from "../lib/live-revenue";

test("only live checkout sessions count as Blueprint revenue", () => {
  assert.equal(isLiveBlueprintEngagement({ stripeRef: "cs_live_abc" }), true);
  assert.equal(isLiveBlueprintEngagement({ stripeRef: "cs_test_abc" }), false);
  assert.equal(isLiveBlueprintEngagement({ stripeRef: "manual" }), false);
  assert.equal(isLiveBlueprintEngagement({}), false);
});

test("summary ignores unpaid orders and only lists kinds with sales", () => {
  const s = summariseRevenue([
    { kind: "website_care", revenueCents: 10000 },
    { kind: "lex_subscription", revenueCents: 0 },
    { kind: "blueprint" },
  ]);
  assert.equal(s.revenueCents, 10000);
  assert.equal(s.paidCount, 1);
  assert.deepEqual(s.byKind.map((k) => k.label), ["Web/Care"]);
  assert.equal(revenueBreakdownLabel(s.byKind), "Web/Care $100");
});

test("empty state is honest", () => {
  const s = summariseRevenue([]);
  assert.equal(s.revenueCents, 0);
  assert.equal(revenueBreakdownLabel(s.byKind), "No sales yet");
});
