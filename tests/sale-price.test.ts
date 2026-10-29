import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getEffectivePrice, discountOf, saleSummary, formatCountdown, srEndText, offerPriceFields, isSalePricingEnabled,
  publicSaleForSlot, checkoutHonoursSale, publicBlockReason, checkoutSaleCharge, saleMetadata, parseSaleInput,
  brisbaneEndOfDay, toBrisbaneIso, endAfterDays, applySalesToText, priceChangeGuard, saleReview, policyBlockReason,
  unwiredSurfaces, PUBLIC_SLOTS, WIRED_SURFACES,
  type PricedProduct, type SaleFields, type Surface, type PublicSlotId,
} from "../lib/sale-price";
import { SALE_POLICY } from "../lib/sale-policy";
import { isActiveOn, feeDisplay } from "../lib/product-pricing";
import { blueprintLineItem, leadgenSaleCoupon } from "../lib/sale-checkout";

const NOW = new Date("2026-11-01T00:00:00+10:00");
const ALL_WIRED: ReadonlySet<Surface> = new Set(Object.values(PUBLIC_SLOTS).flatMap((s) => s.surfaces));
const OPEN_POLICY = { ...SALE_POLICY, blueprintDiscountAllowed: true, recurringDiscountMonths: 3 };

const sale = (o: Partial<SaleFields> = {}): SaleFields => ({
  id: "sale_test1", salePrice: 39_700, saleStartsAt: "2026-10-30T00:00:00+10:00", saleEndsAt: "2026-11-15T23:59:59+10:00", showCountdown: true, ...o,
});
const bp = (o: Partial<SaleFields> | null = {}, extra: Partial<PricedProduct> = {}): PricedProduct => ({
  id: "p1", active: true, createdAt: "2026-01-01T00:00:00+10:00", billingType: "one_time", oneTimeAmount: 49_700,
  sale: o === null ? null : sale({ publicSlot: "blueprint-starter", ...o }), ...extra,
});

// ── Core price ──
test("scheduled, live, ended and until-further-notice", () => {
  assert.equal(getEffectivePrice(bp({ saleStartsAt: "2026-11-02T00:00:00+10:00" }), NOW).status, "scheduled");
  const live = getEffectivePrice(bp(), NOW);
  assert.equal(live.effective, 39_700);
  assert.equal(live.saleId, "sale_test1");
  assert.equal(getEffectivePrice(bp(), new Date("2026-11-15T23:59:59+10:00")).effective, 49_700);
  assert.equal(getEffectivePrice(bp({ saleEndsAt: null }), new Date("2026-12-01T00:00:00+10:00")).status, "live");
});
test("Q6: until-further-notice reviews at 30 days and stops at 90", () => {
  const s = sale({ saleEndsAt: null });
  assert.equal(saleReview(s, new Date("2026-11-28T00:00:00+10:00")).needsReview, false);
  assert.equal(saleReview(s, new Date("2026-11-29T00:00:00+10:00")).needsReview, true);
  assert.equal(getEffectivePrice(bp({ saleEndsAt: null }), new Date("2027-01-28T00:00:00+10:00")).status, "ended");
});
test("invalid sale prices are ignored", () => {
  for (const salePrice of [49_700, 60_000, 0, -5]) assert.equal(getEffectivePrice(bp({ salePrice }), NOW).effective, 49_700);
});
test("percent is floored: 33.5% shows as 33%", () => {
  assert.deepEqual(discountOf(20_000, 13_300), { saveCents: 6_700, savePercent: 33 }); // 33.5%
  assert.deepEqual(discountOf(30_000, 19_950), { saveCents: 10_050, savePercent: 33 }); // 33.5%
  assert.equal(saleSummary(49_700, 39_700), "Save $100, 20% off");
  assert.equal(feeDisplay("one_time", 20_000, [{ appliesTo: "one_time", kind: "fixed", value: 6_700 }]).savePercent, 33);
});

// ── Brisbane time ──
test("dates are stored with +10:00 and end of day is Brisbane", () => {
  assert.equal(brisbaneEndOfDay("2026-11-15"), "2026-11-15T23:59:59+10:00");
  assert.equal(toBrisbaneIso(new Date("2026-11-01T00:00:00Z")), "2026-11-01T10:00:00+10:00");
  assert.match(endAfterDays("2026-11-01T09:00:00+10:00", 7)!, /\+10:00$/);
});
test("isActiveOn (Sell discounts) ends at 23:59:59 Brisbane, not UTC", () => {
  assert.equal(isActiveOn("2026-11-15", Date.parse("2026-11-15T23:59:00+10:00")), true);
  assert.equal(isActiveOn("2026-11-15", Date.parse("2026-11-16T00:00:30+10:00")), false); // was true until 9:59 am under UTC
});

// ── Countdown (Q2) ──
test("countdown: fixed date over 24h, hh mm under, no seconds, sr end date", () => {
  const end = "2026-11-15T23:59:59+10:00";
  assert.equal(formatCountdown(end, new Date("2026-11-10T00:00:00+10:00")), "Sale ends 15 Nov");
  assert.equal(formatCountdown(end, new Date("2026-11-15T18:17:30+10:00")), "Ends in 05h 43m");
  assert.doesNotMatch(formatCountdown(end, new Date("2026-11-15T23:59:00+10:00")), /s$/);
  assert.equal(formatCountdown(end, new Date("2026-11-16T00:00:00+10:00")), "");
  assert.match(srEndText(end), /^Sale ends 15 Nov 2026, 11:59 pm Brisbane time$/);
});

// ── JSON-LD / text ──
test("offer price and priceValidUntil follow the sale", () => {
  assert.deepEqual(offerPriceFields(getEffectivePrice(bp(), NOW)), { price: "397", priceCurrency: "AUD", priceValidUntil: "2026-11-15" });
  assert.deepEqual(offerPriceFields(getEffectivePrice(bp(), new Date("2026-11-16T00:00:00+10:00"))), { price: "497", priceCurrency: "AUD" });
});
test("llms/meta text follows the sale and is unchanged without one", () => {
  const ep = getEffectivePrice(bp(), NOW);
  const t = "Starter $497 (within 48 hours), Pro $1,497";
  assert.equal(applySalesToText(t, {}), t);
  assert.equal(applySalesToText(t, { "blueprint-starter": ep }), "Starter $397 (on sale, was $497 until 15 Nov 2026) (within 48 hours), Pro $1,497");
});

// ── Flag and gate ──
test("flag: off by default, accepts 1 or true", () => {
  assert.equal(isSalePricingEnabled({}), false);
  assert.equal(isSalePricingEnabled({ SALE_PRICING_ENABLED: "yes" }), false);
  assert.equal(isSalePricingEnabled({ SALE_PRICING_ENABLED: "1" }), true);
  assert.equal(isSalePricingEnabled({ SALE_PRICING_ENABLED: "TRUE" }), true);
});
test("gate: every surface for a slot must be wired", () => {
  const opts = { policy: OPEN_POLICY };
  assert.match(publicBlockReason(bp(), opts)!, /Not every page/);
  assert.ok(unwiredSurfaces("blueprint-starter").includes("home"));
  assert.equal(publicBlockReason(bp(), { ...opts, wired: ALL_WIRED }), null);
  assert.equal(checkoutHonoursSale(bp(), { ...opts, wired: ALL_WIRED }), true);
  for (const s of WIRED_SURFACES) assert.ok(ALL_WIRED.has(s));
});
test("gate: care and Lex have no sale checkout, so they never show", () => {
  const care: PricedProduct = { active: true, billingType: "recurring", recurringAmount: 10_000, sale: sale({ salePrice: 8_000, publicSlot: "care-presence" }) };
  assert.match(publicBlockReason(care, { policy: OPEN_POLICY, wired: ALL_WIRED })!, /Checkout can't charge/);
});
test("Q3 and Q7: monthly and Blueprint discounts are off by default", () => {
  const lg: PricedProduct = { billingType: "recurring", recurringAmount: 19_700, sale: sale({ salePrice: 14_700, publicSlot: "leadgen-starter" }) };
  assert.match(policyBlockReason(lg)!, /Monthly fees/);
  assert.match(policyBlockReason(bp())!, /Blueprint discounting/);
  assert.equal(publicSaleForSlot("blueprint-starter", [bp()], { enabled: true, now: NOW, wired: ALL_WIRED }), null);
});
test("gate: regular price must match the published price", () => {
  assert.match(publicBlockReason(bp({}, { oneTimeAmount: 59_700 }), { policy: OPEN_POLICY, wired: ALL_WIRED })!, /doesn't match/);
});

// ── Q5 guard ──
test("Q5: a price change within 28 days blocks the sale", () => {
  const changed = bp({}, { priceHistory: [{ at: "2026-10-20T00:00:00+10:00", fee: "one_time", fromCents: 39_700, toCents: 49_700 }] });
  const g = priceChangeGuard(changed, "2026-11-01T00:00:00+10:00");
  assert.equal(g.ok, false);
  assert.equal(g.daysBefore, 12);
  assert.equal(g.earliestStart, "2026-11-17T00:00:00+10:00");
  const r = parseSaleInput({ salePrice: 39_700, saleStartsAt: "2026-11-01T00:00:00+10:00", saleEndsAt: "2026-11-20T23:59:59+10:00" }, { ...changed, sale: null }, NOW, OPEN_POLICY);
  assert.match(r.error!, /Can't start this sale yet/);
  assert.equal(priceChangeGuard(changed, "2026-11-17T00:00:00+10:00").ok, true);
});
test("parseSaleInput: stores +10:00, generates an id, validates fee", () => {
  const r = parseSaleInput({ salePrice: 39_700, saleEndsAt: "2026-11-15T13:59:59Z", showRibbon: true, publicSlot: "blueprint-starter" }, bp(null), NOW, OPEN_POLICY);
  assert.equal(r.error, undefined);
  assert.equal(r.sale!.saleEndsAt, "2026-11-15T23:59:59+10:00");
  assert.match(r.sale!.saleStartsAt, /\+10:00$/);
  assert.match(r.sale!.id!, /^sale_/);
  assert.equal(r.sale!.showRibbon, true);
  assert.match(parseSaleInput({ salePrice: 1000, appliesTo: "setup" }, bp(null), NOW, OPEN_POLICY).error!, /no setup fee/);
  assert.match(parseSaleInput({ salePrice: 49_700 }, bp(null), NOW, OPEN_POLICY).error!, /below the regular price/);
});

// ── Checkout (Shane review item) ──
const cOpts = { enabled: true, now: NOW, policy: OPEN_POLICY, wired: ALL_WIRED };
test("checkout: charges the server-side sale amount", () => {
  const c = checkoutSaleCharge("blueprint-starter", [bp()], cOpts)!;
  assert.deepEqual(c, { saleId: "sale_test1", wasCents: 49_700, nowCents: 39_700, endsAt: "2026-11-15T23:59:59+10:00" });
  assert.deepEqual(blueprintLineItem("price_fixed", c, "Saabai Starter Blueprint"), {
    price_data: { currency: "aud", unit_amount: 39_700, product_data: { name: "Saabai Starter Blueprint" } }, quantity: 1,
  });
  assert.deepEqual(saleMetadata(c), { sale_id: "sale_test1", sale_was_cents: "49700", sale_now_cents: "39700", sale_ends_at: "2026-11-15T23:59:59+10:00" });
});
test("checkout: flag off uses the fixed price ID", () => {
  const c = checkoutSaleCharge("blueprint-starter", [bp()], { ...cOpts, enabled: false });
  assert.equal(c, null);
  assert.deepEqual(blueprintLineItem("price_fixed", c, "x"), { price: "price_fixed", quantity: 1 });
});
test("checkout: an expired or inactive sale uses the fixed price ID", () => {
  assert.equal(checkoutSaleCharge("blueprint-starter", [bp()], { ...cOpts, now: new Date("2026-11-16T00:00:00+10:00") }), null);
  assert.equal(checkoutSaleCharge("blueprint-starter", [bp({}, { active: false })], cOpts), null);
  assert.equal(checkoutSaleCharge("blueprint-pro", [bp()], cOpts), null);
});
test("checkout: a tampered client price is ignored", () => {
  // No helper accepts a client amount; the routes never read one from the body.
  const tampered = { tier: "starter", amount: 1, unit_amount: 1, salePrice: 1, price: "price_evil" };
  const c = checkoutSaleCharge("blueprint-starter", [bp()], cOpts)!;
  assert.equal((blueprintLineItem("price_fixed", c, "x") as { price_data: { unit_amount: number } }).price_data.unit_amount, 39_700);
  assert.notEqual(c.nowCents, tampered.amount);
  for (const f of ["app/api/blueprint/checkout/route.ts", "app/api/leadgen/checkout/route.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /body\.(amount|unit_amount|salePrice|price)\b/, f);
    assert.doesNotMatch(src, /get\("(amount|unit_amount|salePrice|price)"\)/, f);
  }
});
test("checkout: LeadGen coupon covers only the first N months (Q3)", () => {
  const lg: PricedProduct = { active: true, billingType: "recurring", recurringAmount: 19_700, sale: sale({ salePrice: 14_700, publicSlot: "leadgen-starter" as PublicSlotId }) };
  const c = checkoutSaleCharge("leadgen-starter", [lg], cOpts)!;
  const coupon = leadgenSaleCoupon(c, 3, "LeadGen starter")!;
  assert.equal(coupon.amount_off, 5_000);
  assert.equal(coupon.duration_in_months, 3);
  assert.equal(coupon.max_redemptions, 1);
  assert.equal(leadgenSaleCoupon(c, 0, "x"), null);
  assert.equal(checkoutSaleCharge("leadgen-starter", [lg], { ...cOpts, policy: SALE_POLICY }), null); // default months = 0
});
