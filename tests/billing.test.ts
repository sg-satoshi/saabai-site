import { test } from "node:test";
import assert from "node:assert/strict";
import { dunningDays, dueDunningStep, isLinkExpired, linkExpiresAt, planChangeKind, prorate, shouldPause, statusAfterFailure, statusFromSubscription, upfrontTotals, normaliseDiscount, discountOffCents, discountLabel, normaliseSetupDiscount } from "../lib/billing/state";
import { isRetiredPortalAddon, normaliseCatalog, omitRetiredPortalAddons, SEED_CATALOG, type Addon } from "../lib/billing/catalog";
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

test("retired portal add-ons stay hidden, including a stored catalogue", () => {
  for (const id of ["ai-chatbot", "reviews-carousel", "booking"]) {
    assert.equal(SEED_CATALOG.addons.some((a) => a.id === id), false, id);
  }
  assert.deepEqual(
    SEED_CATALOG.addons.map((a) => [a.id, a.priceCents, a.visible, a.checkout]),
    [
      ["extra-page", 15000, true, "stripe"],
      ["seo-pack", 45000, true, "quote"],
      ["custom-integration", 80000, true, "quote"],
    ],
  );
  const retired: Addon[] = [
    { id: "ai-chatbot", name: "AI chatbot", description: "x", billing: "monthly", priceCents: 9900, checkout: "stripe", visible: true, order: 2, feature: "chatbot", priceVersion: 1 },
    { id: "reviews-carousel", name: "Google reviews carousel", description: "x", billing: "monthly", priceCents: 2500, checkout: "stripe", visible: true, order: 4, feature: "reviews", priceVersion: 1 },
    { id: "booking", name: "Booking system", description: "x", billing: "monthly", priceCents: 4000, checkout: "stripe", visible: true, order: 1, feature: "booking", priceVersion: 1 },
  ];
  const stored = omitRetiredPortalAddons({ ...structuredClone(SEED_CATALOG), addons: [...SEED_CATALOG.addons, ...retired] });
  assert.deepEqual(stored.addons.map((a) => a.id), ["extra-page", "seo-pack", "custom-integration"]);
  assert.equal(isRetiredPortalAddon({ name: "Google reviews carousel" }), true);
  assert.equal(isRetiredPortalAddon({ name: "Booking system" }), true);
  const saved = normaliseCatalog({ ...structuredClone(SEED_CATALOG), addons: [...SEED_CATALOG.addons, ...retired] }, SEED_CATALOG);
  assert.deepEqual(saved.addons.map((a) => a.id), ["extra-page", "seo-pack", "custom-integration"]);
  assert.equal(saved.addons.find((a) => a.id === "extra-page")?.priceCents, 15000);
});

test("emails have no em dashes and the key copy", () => {
  const e1 = setupLinkEmail({ contactName: "Jess Nguyen", siteName: "Harbour Physio", siteDomain: "harbourphysio.com.au", planName: "Presence", monthlyCents: 10000, setupFeeCents: 30000, startDate: "2026-10-14", gst: false, payUrl: "https://www.saabai.ai/pay/abc" });
  assert.match(e1.html, /\$400\.00/);
  assert.match(e1.text, /GST not applicable/);
  const e2 = paymentFailedEmail({ contactName: "Tom", siteName: "bulimbapetwash.com.au", planName: "Presence", amountCents: 10000, updateUrl: "https://x/pay/a?update=1", day: 0 });
  for (const e of [e1, e2]) assert.ok(!/\u2014/.test(e.html + e.text + e.subject));
});

// ---------- admin discount ----------

test("discount: percent and amount off", () => {
  assert.equal(discountOffCents(20000, { type: "percent", value: 50 }), 10000);
  assert.equal(discountOffCents(20000, { type: "amount", value: 10000 }), 10000);
  assert.equal(discountOffCents(20000, undefined), 0);
});

test("discount: validation", () => {
  assert.deepEqual(normaliseDiscount(undefined, 20000), { ok: true });
  assert.equal(normaliseDiscount({ type: "percent", value: 150 }, 20000).ok, false);
  assert.equal(normaliseDiscount({ type: "amount", value: 30000 }, 20000).ok, false);
  const r = normaliseDiscount({ type: "percent", value: 50, months: 3, label: " Mates rates " }, 20000);
  assert.deepEqual(r, { ok: true, discount: { type: "percent", value: 50, months: 3, label: "Mates rates" } });
});

test("discount: label and setup email show original, discount and new price", () => {
  assert.equal(discountLabel({ type: "percent", value: 50, label: "Mates rates" }, (c) => `$${c / 100}`), "Mates rates (50% off)");
  const e = setupLinkEmail({ contactName: "Jess", siteName: "Harbour Physio", planName: "Growth", monthlyCents: 20000, setupFeeCents: 0, startDate: "2026-11-10", gst: false, payUrl: "https://x/pay/a", discount: { type: "amount", value: 10000, label: "Founding client" } });
  assert.match(e.html, /\$200\.00/);
  assert.match(e.html, /Founding client \(\$100\.00 off\)/);
  assert.match(e.html, /-\$100\.00/);
  assert.match(e.html, /saving \$100\.00 every month/);
});

// ---------- setup fee discount ----------

test("setup discount: validation, waiver and sub-$1 guard", () => {
  assert.deepEqual(normaliseSetupDiscount(undefined, 200000), { ok: true });
  assert.deepEqual(normaliseSetupDiscount({ type: "percent", value: 50 }, 0), { ok: true });
  assert.equal(normaliseSetupDiscount({ type: "percent", value: 100 }, 200000).ok, true);
  assert.equal(normaliseSetupDiscount({ type: "amount", value: 200000 }, 200000).ok, true);
  assert.equal(normaliseSetupDiscount({ type: "amount", value: 199950 }, 200000).ok, false);
  assert.equal(normaliseSetupDiscount({ type: "amount", value: 300000 }, 200000).ok, false);
});

test("setup discount: email shows original fee, discount and waiver", () => {
  const base = { contactName: "Jess", siteName: "Harbour Physio", planName: "Presence", monthlyCents: 10000, setupFeeCents: 200000, startDate: "2026-11-10", gst: false, payUrl: "https://x/pay/a" };
  const e = setupLinkEmail({ ...base, setupDiscount: { type: "percent", value: 25, label: "Founding client" } });
  assert.match(e.html, /\$2,000\.00/);
  assert.match(e.html, /-\$500\.00/);
  assert.match(e.html, /down from \$2,000\.00/);
  assert.match(e.html, /\$1,600\.00/);
  const w = setupLinkEmail({ ...base, setupDiscount: { type: "percent", value: 100 }, discount: { type: "percent", value: 100 } });
  assert.match(w.html, /setup fee is waived/);
  for (const m of [e, w]) assert.ok(!/\u2014/.test(m.html + m.text + m.subject));
});

test("pay link re-open reuses an open Checkout Session; a code forces a fresh one", async () => {
  const { checkoutReuseAction } = await import("../lib/billing/state");
  assert.equal(checkoutReuseAction("open", false), "reuse");
  assert.equal(checkoutReuseAction("open", true), "expire_then_new");
  assert.equal(checkoutReuseAction("complete", false), "already_paid");
  assert.equal(checkoutReuseAction("expired", false), "new");
  assert.equal(checkoutReuseAction(null, false), "new");
});

test("a second paid setup checkout never overwrites the live subscription", async () => {
  const { isDuplicateSetupPayment } = await import("../lib/billing/state");
  assert.equal(isDuplicateSetupPayment({ status: "active", stripeSubscriptionId: "sub_1" }, "sub_2"), true);
  assert.equal(isDuplicateSetupPayment({ status: "active", stripeSubscriptionId: "sub_1" }, "sub_1"), false);
  assert.equal(isDuplicateSetupPayment({ status: "pending" }, "sub_1"), false);
  assert.equal(isDuplicateSetupPayment({ status: "cancelled", stripeSubscriptionId: "sub_1" }, "sub_2"), false);
});

// ---------- first payment date (4a + future date) ----------
const NOW = Date.parse("2026-11-05T00:30:00Z"); // 10:30 Brisbane, 5 Nov
const BASE = { contactName: "Jess", siteName: "Harbour Physio", planName: "Presence", gst: false, payUrl: "https://x/pay/a", now: NOW };

test("first payment date: today to 90 days, not past", async () => {
  const { validateFirstPaymentDate, firstChargeAt } = await import("../lib/billing/state");
  assert.equal(validateFirstPaymentDate("2026-11-05", NOW), null);
  assert.equal(validateFirstPaymentDate("2027-02-03", NOW), null);
  assert.match(validateFirstPaymentDate("2027-02-04", NOW)!, /90 days/);
  assert.match(validateFirstPaymentDate("2026-11-04", NOW)!, /past/);
  assert.deepEqual(firstChargeAt("2026-11-05", NOW), { mode: "now" });
  assert.equal(firstChargeAt("2026-12-01", NOW).mode, "future");
});

test("setup waived + $100/mo today: $100 due today", () => {
  const e = setupLinkEmail({ ...BASE, monthlyCents: 10000, setupFeeCents: 200000, startDate: "2026-11-05", setupDiscount: { type: "percent", value: 100 } });
  assert.match(e.html, /Due today[\s\S]*?\$100\.00/);
  assert.doesNotMatch(e.html, /First payment on/);
});

test("no discounts today: setup + first month due today", () => {
  const e = setupLinkEmail({ ...BASE, monthlyCents: 10000, setupFeeCents: 200000, startDate: "2026-11-05" });
  assert.match(e.html, /Due today[\s\S]*?\$2,100\.00/);
});

test("setup discounted + monthly 50% for 3 months today: exactly 3 discounted charges", async () => {
  const { couponDurationMonths, couponCovers, chargeDates } = await import("../lib/billing/state");
  const e = setupLinkEmail({ ...BASE, monthlyCents: 10000, setupFeeCents: 200000, startDate: "2026-11-05", setupDiscount: { type: "amount", value: 100000 }, discount: { type: "percent", value: 50, months: 3 } });
  assert.match(e.html, /Due today[\s\S]*?\$1,050\.00/);
  const dur = couponDurationMonths(3, NOW);
  assert.equal(dur, 3);
  assert.deepEqual(chargeDates(NOW, 5).map((c) => couponCovers(NOW, dur, c)), [true, true, true, false, false]);
});

test("future first payment: $0 today, discount months counted from the first charge", async () => {
  const { couponDurationMonths, couponCovers, chargeDates, firstChargeAt } = await import("../lib/billing/state");
  const e = setupLinkEmail({ ...BASE, monthlyCents: 10000, setupFeeCents: 200000, startDate: "2026-12-20", setupDiscount: { type: "amount", value: 100000 }, discount: { type: "percent", value: 50, months: 3 } });
  assert.match(e.html, /First payment on 20 Dec[\s\S]*?\$1,050\.00/);
  assert.match(e.html, /Due today \(card saved only\)[\s\S]*?\$0\.00/);
  for (const date of ["2026-11-06", "2026-12-05", "2026-12-20", "2027-02-03"]) {
    const f = firstChargeAt(date, NOW);
    assert.equal(f.mode, "future");
    const at = (f as { at: number }).at;
    for (const n of [1, 3, 6]) {
      const dur = couponDurationMonths(n, NOW, at);
      const covered = chargeDates(at, n + 3).map((c) => couponCovers(NOW, dur, c));
      assert.equal(covered.filter(Boolean).length, n, `${date} x${n}`);
      assert.equal(covered.slice(0, n).every(Boolean), true);
    }
  }
});
