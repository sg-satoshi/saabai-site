import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getEffectivePrice, discountOf, saleSummary, formatCountdown, offerPriceFields, isSalePricingEnabled,
  publicSaleForSlot, checkoutHonoursSale, parseSaleInput, brisbaneEndOfDay, endAfterDays, PUBLIC_SLOTS,
  type PricedProduct, type SaleFields,
} from "../lib/sale-price";

const NOW = new Date("2026-11-01T00:00:00Z");
const base = (sale?: Partial<SaleFields> | null): PricedProduct => ({
  billingType: "one_time",
  oneTimeAmount: 49_700,
  sale: sale === null || sale === undefined ? sale : { salePrice: 39_700, saleStartsAt: "2026-10-30T00:00:00Z", saleEndsAt: "2026-11-15T13:59:59Z", showCountdown: true, ...sale },
});

test("getEffectivePrice: before start is scheduled at the original price", () => {
  const ep = getEffectivePrice(base({ saleStartsAt: "2026-11-02T00:00:00Z" }), NOW);
  assert.equal(ep.status, "scheduled");
  assert.equal(ep.effective, 49_700);
  assert.equal(ep.onSale, false);
});
test("getEffectivePrice: live sale", () => {
  const ep = getEffectivePrice(base({}), NOW);
  assert.equal(ep.status, "live");
  assert.equal(ep.effective, 39_700);
  assert.equal(ep.saveCents, 10_000);
  assert.equal(ep.savePercent, 20);
  assert.equal(ep.showCountdown, true);
});
test("getEffectivePrice: after end reverts automatically", () => {
  const ep = getEffectivePrice(base({}), new Date("2026-11-15T14:00:00Z"));
  assert.equal(ep.status, "ended");
  assert.equal(ep.effective, 49_700);
});
test("getEffectivePrice: until further notice never ends, no countdown", () => {
  const ep = getEffectivePrice(base({ saleEndsAt: null }), new Date("2030-01-01T00:00:00Z"));
  assert.equal(ep.status, "live");
  assert.equal(ep.showCountdown, false);
});
test("getEffectivePrice: invalid sale (>= original or <= 0) is ignored", () => {
  for (const salePrice of [49_700, 60_000, 0, -5]) {
    const ep = getEffectivePrice(base({ salePrice }), NOW);
    assert.equal(ep.status, "invalid");
    assert.equal(ep.effective, 49_700);
  }
  assert.equal(getEffectivePrice(base(null), NOW).status, "none");
});
test("$ and % rounding", () => {
  assert.deepEqual(discountOf(49_700, 33_333), { saveCents: 16_367, savePercent: 33 });
  assert.deepEqual(discountOf(30_000, 19_950), { saveCents: 10_050, savePercent: 34 });
  assert.equal(saleSummary(49_700, 39_700), "$100 off (20%)");
  assert.equal(saleSummary(19_700, 14_775), "$49.25 off (25%)");
});
test("flag: off by default, accepts 1 or true", () => {
  assert.equal(isSalePricingEnabled({}), false);
  assert.equal(isSalePricingEnabled({ SALE_PRICING_ENABLED: "yes" }), false);
  assert.equal(isSalePricingEnabled({ SALE_PRICING_ENABLED: "1" }), true);
  assert.equal(isSalePricingEnabled({ SALE_PRICING_ENABLED: "TRUE" }), true);
});
test("flag off is a no-op even for an honoured live sale", () => {
  const orig = PUBLIC_SLOTS["blueprint-starter"].checkoutHonoursSale;
  PUBLIC_SLOTS["blueprint-starter"].checkoutHonoursSale = true;
  try {
    const p = base({ publicSlot: "blueprint-starter" });
    assert.equal(publicSaleForSlot("blueprint-starter", [p], { enabled: false, now: NOW }), null);
    assert.equal(publicSaleForSlot("blueprint-starter", [p], { enabled: true, now: NOW })?.effective, 39_700);
  } finally {
    PUBLIC_SLOTS["blueprint-starter"].checkoutHonoursSale = orig;
  }
});
test("checkout integrity: fixed Stripe price IDs keep the public display off", () => {
  const p = base({ publicSlot: "blueprint-starter" });
  assert.equal(checkoutHonoursSale(p), false);
  assert.equal(publicSaleForSlot("blueprint-starter", [p], { enabled: true, now: NOW }), null);
  assert.equal(checkoutHonoursSale(base({})), false); // not linked to any public price
  for (const s of Object.values(PUBLIC_SLOTS)) assert.equal(s.checkoutHonoursSale, false);
});
test("checkout integrity: price mismatch with the published price blocks display", () => {
  const orig = PUBLIC_SLOTS["blueprint-starter"].checkoutHonoursSale;
  PUBLIC_SLOTS["blueprint-starter"].checkoutHonoursSale = true;
  try {
    const p = { ...base({ publicSlot: "blueprint-starter", salePrice: 40_000 }), oneTimeAmount: 59_700 };
    assert.equal(checkoutHonoursSale(p), false);
  } finally {
    PUBLIC_SLOTS["blueprint-starter"].checkoutHonoursSale = orig;
  }
});
test("JSON-LD: effective price plus priceValidUntil (Brisbane date)", () => {
  assert.deepEqual(offerPriceFields(getEffectivePrice(base({}), NOW)), { price: "397", priceCurrency: "AUD", priceValidUntil: "2026-11-15" });
  assert.deepEqual(offerPriceFields(getEffectivePrice(base({ saleEndsAt: null }), NOW)), { price: "397", priceCurrency: "AUD" });
  assert.deepEqual(offerPriceFields(getEffectivePrice(base(null), NOW)), { price: "497", priceCurrency: "AUD" });
  assert.equal(offerPriceFields(getEffectivePrice(base({ salePrice: 14_950 }), NOW)).price, "149.50");
});
test("countdown formatting", () => {
  assert.equal(formatCountdown("2026-11-03T14:03:30Z", NOW), "Ends in 2d 14h 03m");
  assert.equal(formatCountdown("2026-11-01T05:09:00Z", NOW), "Ends in 5h 09m");
  assert.equal(formatCountdown("2026-11-01T00:07:00Z", NOW), "Ends in 7m");
  assert.equal(formatCountdown("2026-11-01T00:00:20Z", NOW), "Ends in 20s");
  assert.equal(formatCountdown("2026-11-15T13:59:59Z", NOW), "Sale ends 15 Nov");
  assert.equal(formatCountdown("2026-11-01T00:00:00Z", NOW), "");
  assert.equal(formatCountdown("2026-10-01T00:00:00Z", NOW), "");
});
test("Brisbane dates and durations", () => {
  assert.equal(brisbaneEndOfDay("2026-11-15"), "2026-11-15T13:59:59.000Z");
  assert.equal(endAfterDays("2026-11-01T00:00:00.000Z", 7), "2026-11-08T00:00:00.000Z");
  assert.equal(endAfterDays("2026-11-01T00:00:00.000Z", 0), null);
});
test("parseSaleInput validates", () => {
  assert.equal(parseSaleInput({ salePrice: 49_700 }, 49_700, NOW).error, "Sale price must be less than the original price.");
  assert.equal(parseSaleInput({ salePrice: 0 }, 49_700, NOW).error, "Sale price must be more than $0.");
  assert.equal(parseSaleInput({ salePrice: 100, saleStartsAt: "2026-11-05T00:00:00Z", saleEndsAt: "2026-11-04T00:00:00Z" }, 49_700, NOW).error, "End must be after the start.");
  assert.equal(parseSaleInput({ salePrice: 100, publicSlot: "nope" }, 49_700, NOW).error, "Unknown public price");
  const ok = parseSaleInput({ salePrice: 39_700, publicSlot: "blueprint-starter", showCountdown: true }, 49_700, NOW).sale!;
  assert.equal(ok.saleStartsAt, NOW.toISOString());
  assert.equal(ok.saleEndsAt, null);
  assert.equal(parseSaleInput(null, 49_700, NOW).sale, null);
});
test("copy has no em dashes", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["lib/sale-price.ts", "app/saabai-admin/products/SalePriceSection.tsx", "app/components/sale/SalePrice.tsx", "app/components/sale/SaleCountdown.tsx"]) {
    assert.equal(readFileSync(f, "utf8").includes("\u2014"), false, f);
  }
});
