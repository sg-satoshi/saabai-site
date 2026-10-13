import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyCents, summariseSubscriptions, summariseSiteBilling, summariseInvoices, countRecentLeads, countOpenRequests } from "../lib/business-summary";

const item = (unitAmount: number, interval: string, intervalCount = 1, quantity = 1) => ({ unitAmount, interval, intervalCount, quantity });

test("monthlyCents normalises intervals", () => {
  assert.equal(monthlyCents({ status: "active", livemode: true, items: [item(5000, "month")] }), 5000);
  assert.equal(monthlyCents({ status: "active", livemode: true, items: [item(120000, "year")] }), 10000);
  assert.equal(monthlyCents({ status: "active", livemode: true, items: [item(3000, "month", 3)] }), 1000);
});

test("MRR counts live paying subs only; past due flagged", () => {
  const s = summariseSubscriptions([
    { status: "active", livemode: true, items: [item(5000, "month")] },
    { status: "past_due", livemode: true, items: [item(20000, "month")] },
    { status: "active", livemode: false, items: [item(99900, "month")] },
    { status: "incomplete", livemode: true, items: [item(10000, "month")] },
  ]);
  assert.deepEqual(s, { mrrCents: 25000, activeCount: 2, pastDueCount: 1, pastDueCents: 20000 });
});

test("site billing, invoices, leads, requests", () => {
  assert.deepEqual(summariseSiteBilling([{ status: "paused" }, { status: "past_due" }, { status: "pending" }, { status: "active" }]), { paused: 1, failing: 1, pendingLinks: 1 });
  assert.deepEqual(summariseInvoices([{ status: "overdue", total: 110 }, { status: "unpaid", total: 55.5 }, { status: "paid", total: 999 }]), { overdueCount: 1, overdueCents: 11000, unpaidCount: 1, unpaidCents: 5550 });
  const now = Date.UTC(2026, 9, 14);
  assert.equal(countRecentLeads([{ createdAt: now - 86400000 }, { createdAt: now - 8 * 86400000 }, { createdAt: "bad" }, {}], now), 1);
  assert.deepEqual(countOpenRequests([{ status: "new" }, { status: "received" }, { status: "awaiting_client" }, { status: "done" }]), { open: 3, awaitingClient: 1, isNew: 2 });
});
