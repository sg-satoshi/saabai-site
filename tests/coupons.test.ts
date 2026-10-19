import { test } from "node:test";
import assert from "node:assert/strict";
import { brisbaneEndOfDay, buildStripeParams, parseCouponInput, redemptionFrom, TARGETS, normaliseCode, shareLinks } from "../lib/coupons/core";

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

import { couponCoversProducts, describeCoverage, parseTargets, searchProductTargets, targetsFromMetadata } from "../lib/coupons/core";

test("multi-product: 4 of 6 products map to one Stripe coupon with a product list", () => {
  const i = parseCouponInput({ code: "FOUR20", value: 20, targets: ["care_signature", "blueprint_pro", "blueprint_starter", "care_growth", "blueprint_pro", "bogus"] });
  assert.ok(typeof i !== "string");
  assert.deepEqual(i.targets, ["blueprint_starter", "blueprint_pro", "care_growth", "care_signature"]);
  assert.equal(i.target, "multi");
  const p = buildStripeParams(i, ["prod_a", "prod_b", "prod_c", "prod_d", "prod_a"]);
  assert.deepEqual(p.coupon.applies_to, { products: ["prod_a", "prod_b", "prod_c", "prod_d"] });
  assert.equal((p.coupon.metadata as Record<string, string>).targets, "blueprint_starter,blueprint_pro,care_growth,care_signature");
  assert.equal(p.promo.metadata && (p.promo.metadata as Record<string, string>).target, "multi");
  assert.throws(() => buildStripeParams(i, []));
});

test("legacy single target and All still behave exactly as before", () => {
  const one = parseCouponInput({ code: "PRO10", value: 10, target: "blueprint_pro" });
  assert.ok(typeof one !== "string");
  assert.equal(one.target, "blueprint_pro");
  assert.deepEqual(one.targets, ["blueprint_pro"]);
  const p = buildStripeParams(one, "prod_pro");
  assert.deepEqual(p.coupon.applies_to, { products: ["prod_pro"] });
  assert.equal((p.promo.metadata as Record<string, string>).target, "blueprint_pro");
  for (const body of [{ target: "all" }, {}, { targets: [] }, { targets: ["all", "care_growth"] }]) {
    const a = parseCouponInput({ code: "ALLP", value: 5, ...body });
    assert.ok(typeof a !== "string");
    assert.equal(a.target, "all");
    assert.deepEqual(a.targets, []);
    assert.equal(buildStripeParams(a, null).coupon.applies_to, undefined);
  }
  assert.deepEqual(parseTargets({ target: "nonsense" }), []);
});

test("reading coverage back from old and new codes", () => {
  assert.deepEqual(targetsFromMetadata({ target: "blueprint_pro" }), { targets: ["blueprint_pro"], unknownProducts: 0 });
  assert.deepEqual(targetsFromMetadata({ target: "multi", targets: "blueprint_pro,care_growth" }), { targets: ["blueprint_pro", "care_growth"], unknownProducts: 0 });
  assert.deepEqual(targetsFromMetadata({ target: "all" }), { targets: [], unknownProducts: 0 });
  assert.deepEqual(targetsFromMetadata({}, ["prod_x", "prod_y"]), { targets: [], unknownProducts: 2 });
  assert.equal(describeCoverage([]), "All products");
  assert.equal(describeCoverage([], 2), "2 products");
  assert.equal(describeCoverage(["blueprint_pro"]), "Blueprint Pro ($1,497)");
  assert.equal(describeCoverage(["blueprint_pro", "care_growth", "care_presence"]), "3 products");
});

test("checkout eligibility: discount only when a bought product is covered", () => {
  assert.equal(couponCoversProducts(undefined, ["prod_a"]), true);
  assert.equal(couponCoversProducts([], ["prod_a"]), true);
  assert.equal(couponCoversProducts(["prod_a", "prod_b"], ["prod_b"]), true);
  assert.equal(couponCoversProducts(["prod_a", "prod_b"], ["prod_z", "prod_b"]), true);
  assert.equal(couponCoversProducts(["prod_a", "prod_b"], ["prod_z"]), false);
  assert.equal(couponCoversProducts(["prod_a"], [undefined, null]), false);
});

test("picker search matches label or group; blank returns all six", () => {
  assert.equal(searchProductTargets("").length, 6);
  assert.deepEqual(searchProductTargets("blueprint").map((t) => t.id), ["blueprint_starter", "blueprint_pro", "blueprint_business"]);
  assert.deepEqual(searchProductTargets("GROWTH").map((t) => t.id), ["care_growth"]);
  assert.equal(searchProductTargets("zzz").length, 0);
});

test("share links: All products offers every Blueprint tier with the code", () => {
  const s = shareLinks("newclient50", []);
  assert.deepEqual(s.links.map((l) => l.id), ["blueprint_starter", "blueprint_pro", "blueprint_business"]);
  assert.equal(s.links[1].url, "https://www.saabai.ai/blueprint/checkout?tier=pro&code=NEWCLIENT50");
  assert.equal(s.careNote, true);
  assert.equal(s.paySuffix, "?code=NEWCLIENT50");
});

test("share links: single, multi and mixed coverage", () => {
  assert.deepEqual(shareLinks("A1B", ["blueprint_pro"]).links.map((l) => l.id), ["blueprint_pro"]);
  const multi = shareLinks("A1B", ["blueprint_starter", "blueprint_business", "care_growth"]);
  assert.deepEqual(multi.links.map((l) => l.id), ["blueprint_starter", "blueprint_business"]);
  assert.equal(multi.careNote, true);
});

test("share links: care-only code has no URL, only the pay-link suffix; unknown restriction offers none", () => {
  const care = shareLinks("CARE20", ["care_presence", "care_signature"]);
  assert.equal(care.links.length, 0);
  assert.equal(care.careNote, true);
  const unk = shareLinks("DASH", [], 2);
  assert.equal(unk.links.length, 0);
  assert.equal(unk.careNote, false);
});

test("share links: code is normalised and URL-encoded, custom base respected", () => {
  const s = shareLinks("save 10&x=1", ["blueprint_starter"], 0, "http://localhost:3000");
  assert.equal(s.links[0].url, "http://localhost:3000/blueprint/checkout?tier=starter&code=SAVE10X1");
});
