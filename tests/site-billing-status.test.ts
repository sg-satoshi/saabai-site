import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSiteBilling } from "../lib/site-billing-status";

const stu = { id: "cycle-repair", slug: "cycle-repair", name: "Stu's Cycle Repairs", domains: ["stuscyclerepairs.com"] };

test("stripe siteId match picks best status", () => {
  const subs = [
    { status: "canceled", siteId: "cycle-repair", amount: 5000, interval: "month" },
    { status: "active", siteId: "cycle-repair", amount: 5000, interval: "month" },
  ];
  assert.equal(computeSiteBilling(stu, subs).state, "active");
});

test("siteId for another site does not match", () => {
  assert.equal(computeSiteBilling({ id: "lmm-site", slug: "lmm-site", name: "LMM" }, [{ status: "active", siteId: "cycle-repair" }]).state, "none");
});

test("domain in description matches; past_due maps", () => {
  const r = computeSiteBilling(stu, [{ status: "past_due", description: "StusCycleRepairs.com website" }]);
  assert.equal(r.state, "past_due");
});

test("care plan record counts, legacy id prefix handled", () => {
  assert.equal(computeSiteBilling({ id: "legacy_lmm-site", slug: "lmm-site", billing: { amount: 9900, status: "paused" } }, []).state, "paused");
  assert.equal(computeSiteBilling({ id: "legacy_lmm-site", slug: "lmm-site" }, [{ status: "active", siteId: "lmm-site" }]).state, "active");
});

test("nothing set up is none", () => {
  assert.equal(computeSiteBilling({ id: "x", slug: "x", name: "Tributum Law" }, []).state, "none");
});
