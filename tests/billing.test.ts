import { test } from "node:test";
import assert from "node:assert/strict";
import { dunningDays, dueDunningStep, isLinkExpired, linkExpiresAt, planChangeKind, prorate, shouldPause, statusAfterFailure, statusFromSubscription, upfrontTotals } from "../lib/billing/state";
import { normaliseCatalog, SEED_CATALOG } from "../lib/billing/catalog";
import { paymentFailedEmail, setupLinkEmail } from "../lib/billing/emails";

const DAY = 86_400_000;

test("dunning schedule: day 0, 1, 3, 7, then every 7 days", () => {
  assert.deepEqual(dunningDays(30), [0, 1, 3, 7, 14, 21, 28]);
});

test("due dunning steps", () => {
  const t0 = Date.parse("2026-10-01T00:00:00Z");
  const f = new Date(t0).toISOString();
  assert.equal(dueDunningStep(f, 0, t0), 0);
  assert.equal(dueDunningStep(f, 1, t0 + 0.5 * DAY), null);
  assert.equal(dueDunningStep(f, 1, t0 + 1 * DAY), 1);
  assert.equal(dueDunningStep(f, 2, t0 + 2 * DAY), null);
  assert.equal(dueDunningStep(f, 2, t0 + 3 * DAY), 2);
  assert.equal(dueDunningStep(f, 3, t0 + 7 * DAY), 3);
  assert.equal(dueDunningStep(f, 4, t0 + 13 * DAY), null);
  assert.equal(dueDunningStep(f, 4, t0 + 14 * DAY), 4);
});

test("states: failure, past due after first failed retry, pause after 30 days", () => {
  assert.equal(statusAfterFailure("active", 1), "payment_failed");
  assert.equal(statusAfterFailure("payment_failed", 2), "past_due");
  assert.equal(statusAfterFailure("paused", 3), "paused");
  const f = new Date(Date.now() - 30 * DAY).toISOString();
  assert.equal(shouldPause(f), true);
  assert.equal(shouldPause(new Date(Date.now() - 29 * DAY).toISOString()), false);
  assert.equal(statusFromSubscription({ status: "active", cancel_at_period_end: true }, "active"), "cancelling");
  assert.equal(statusFromSubscription({ status: "canceled" }, "cancelling"), "cancelled");
});

test("link expires after 7 days", () => {
  const sent = "2026-10-14T00:00:00.000Z";
  const exp = linkExpiresAt(sent);
  assert.equal(exp, "2026-10-21T00:00:00.000Z");
  assert.equal(isLinkExpired(exp, Date.parse("2026-10-20T23:00:00Z")), false);
  assert.equal(isLinkExpired(exp, Date.parse("2026-10-21T01:00:00Z")), true);
});

test("plan change and proration", () => {
  assert.equal(planChangeKind(10000, 20000), "upgrade");
  assert.equal(planChangeKind(20000, 10000), "downgrade");
  const start = "2026-10-01T00:00:00Z", end = "2026-10-31T00:00:00Z";
  assert.equal(prorate(10000, start, end, Date.parse("2026-10-16T00:00:00Z")), 5000);
});

test("upfront totals, GST off and on", () => {
  assert.deepEqual(upfrontTotals(10000, 30000, false), { firstMonth: 10000, setup: 30000, gst: 0, dueNow: 40000, monthly: 10000 });
  assert.equal(upfrontTotals(10000, 0, true).dueNow, 11000);
});

test("catalogue seed matches /websites and price changes bump version", () => {
  assert.deepEqual(SEED_CATALOG.plans.map((p) => [p.name, p.priceCents]), [["Presence", 10000], ["Growth", 20000], ["Signature", 30000]]);
  const next = structuredClone(SEED_CATALOG);
  next.plans[0].priceCents = 12000;
  next.plans[1].features = ["Edited"];
  const out = normaliseCatalog(next, SEED_CATALOG);
  assert.equal(out.plans[0].priceVersion, 2);
  assert.equal(out.plans[1].priceVersion, 1);
  assert.deepEqual(out.plans[1].features, ["Edited"]);
});

test("emails have no em dashes and the key copy", () => {
  const e1 = setupLinkEmail({ contactName: "Jess Nguyen", siteName: "Harbour Physio", siteDomain: "harbourphysio.com.au", planName: "Presence", monthlyCents: 10000, setupFeeCents: 30000, startDate: "2026-10-14", gst: false, payUrl: "https://www.saabai.ai/pay/abc" });
  assert.match(e1.html, /\$400\.00/);
  assert.match(e1.text, /GST not applicable/);
  const e2 = paymentFailedEmail({ contactName: "Tom", siteName: "bulimbapetwash.com.au", planName: "Presence", amountCents: 10000, updateUrl: "https://x/pay/a?update=1", day: 0 });
  for (const e of [e1, e2]) assert.ok(!/\u2014/.test(e.html + e.text + e.subject));
});
