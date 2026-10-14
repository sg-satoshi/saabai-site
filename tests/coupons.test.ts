import { test } from "node:test";
import assert from "node:assert/strict";
import { brisbaneEndOfDay, buildStripeParams, parseCouponInput, redemptionFrom, TARGETS, normaliseCode } from "../lib/coupons/core";

test("expiry is 11:59:59 pm Brisbane on the chosen day", () => {
  const ts = brisbaneEndOfDay("2026-10-31")!;
  assert.equal(new Date(ts * 1000).toISOString(), "2026-10-31T13:59:59.000Z");
  assert.equal(brisbaneEndOfDay("31/10/2026"), null);
});

test("picker has All plus the six real products", () => {
  assert.deepEqual(TARGETS.map((t) => t.id), ["all", "blueprint_starter", "blueprint_pro", "blueprint_business", "care_presence", "care_growth", "care_signature"]);
});

test("first-time, minimum spend, product and expiry map to Stripe params", () => {
  const i = parseCouponInput({ code: " newclient50 ", kind: "percent", value: 50, target: "care_growth", firstTimeOnly: true, minimumSpend: "150", maxRedemptions: "20", expiresAt: "2099-01-01" });
  assert.ok(typeof i !== "string");
  const p = buildStripeParams(i, "prod_care_growth");
  assert.equal(p.promo.code, "NEWCLIENT50");
  assert.deepEqual(p.promo.restrictions, { first_time_transaction: true, minimum_amount: 15000, minimum_amount_currency: "aud" });
  assert.equal(p.promo.max_redemptions, 20);
  assert.equal(p.promo.expires_at, brisbaneEndOfDay("2099-01-01"));
  assert.deepEqual(p.coupon.applies_to, { products: ["prod_care_growth"] });
  assert.equal(p.coupon.percent_off, 50);
});

test("all-products code has no restriction; product target without product throws", () => {
  const i = parseCouponInput({ code: "SAVE100", kind: "fixed", value: 100, target: "all" });
  assert.ok(typeof i !== "string");
  const p = buildStripeParams(i, null);
  assert.equal(p.coupon.applies_to, undefined);
  assert.equal(p.coupon.amount_off, 10000);
  assert.equal(p.coupon.currency, "aud");
  assert.equal(p.promo.restrictions, undefined);
  const j = parseCouponInput({ code: "PRO10", value: 10, target: "blueprint_pro" });
  assert.ok(typeof j !== "string");
  assert.throws(() => buildStripeParams(j, null));
});

test("bad input is rejected", () => {
  assert.equal(typeof parseCouponInput({ code: "X", value: 10 }), "string");
  assert.equal(typeof parseCouponInput({ code: "ABC", value: 120 }), "string");
  assert.equal(typeof parseCouponInput({ code: "ABC", value: 10, expiresAt: "2020-01-01" }), "string");
  assert.equal(normaliseCode("a b-c_1!"), "AB-C_1");
});

test("redemption is read from a completed checkout session", () => {
  assert.equal(redemptionFrom({ total_details: { amount_discount: 0 }, discounts: [] }), null);
  const r = redemptionFrom({ total_details: { amount_discount: 24850 }, discounts: [{ promotion_code: "promo_1", coupon: "co_1" }], metadata: { coupon_code: "NEWCLIENT50" } })!;
  assert.deepEqual(r, { code: "NEWCLIENT50", promotionCodeId: "promo_1", couponId: "co_1", discountCents: 24850 });
});
