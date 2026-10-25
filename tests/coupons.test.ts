import { test } from "node:test";
import assert from "node:assert/strict";
import { brisbaneEndOfDay, brisbaneStartOfDay, brisbaneStartOfToday, buildStripeParams, codeStartsAt, isOncePerCustomer, normaliseEmail, notStartedMessage, onceKey, parseCouponInput, promoIsOnce, promoNotStartedMessage, redemptionFrom, TARGETS, normaliseCode, shareLinks } from "../lib/coupons/core";

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

const futureDay = (daysAhead: number) => new Date(Date.now() + (daysAhead * 86400 + 10 * 3600) * 1000).toISOString().slice(0, 10);

test("start date is Brisbane midnight at the start of the chosen day", () => {
  assert.equal(new Date(brisbaneStartOfDay("2026-11-12")! * 1000).toISOString(), "2026-11-11T14:00:00.000Z");
  assert.equal(brisbaneStartOfDay("12/11/2026"), null);
  // 2026-10-19 11:00 Brisbane -> start of that day
  assert.equal(new Date(brisbaneStartOfToday(Date.parse("2026-10-19T01:00:00Z")) * 1000).toISOString(), "2026-10-18T14:00:00.000Z");
  // 23:30 Brisbane is still the same Brisbane day
  assert.equal(new Date(brisbaneStartOfToday(Date.parse("2026-10-19T13:30:00Z")) * 1000).toISOString(), "2026-10-18T14:00:00.000Z");
});

test("start date: future date is stored in coupon + promo metadata; blank/today means no start date", () => {
  const i = parseCouponInput({ code: "LAUNCH", kind: "percent", value: 20, target: "all", startsAt: futureDay(5) });
  assert.ok(typeof i !== "string" && i.startsAt);
  const p = buildStripeParams(i, null);
  assert.equal((p.promo.metadata as Record<string, string>).starts_at, String(i.startsAt));
  assert.equal((p.coupon.metadata as Record<string, string>).starts_at, String(i.startsAt));
  const blank = parseCouponInput({ code: "LAUNCH", kind: "percent", value: 20, startsAt: "" });
  assert.ok(typeof blank !== "string" && blank.startsAt === undefined);
  assert.equal("starts_at" in (buildStripeParams(blank as never, null).promo.metadata as object), false);
  const today = parseCouponInput({ code: "LAUNCH", kind: "percent", value: 20, startsAt: futureDay(0) });
  assert.ok(typeof today !== "string" && today.startsAt === undefined);
});

test("start date: invalid, past and after-expiry are rejected with clear errors", () => {
  assert.equal(parseCouponInput({ code: "LAUNCH", kind: "percent", value: 20, startsAt: "soon" }), "Start date isn't valid");
  assert.equal(parseCouponInput({ code: "LAUNCH", kind: "percent", value: 20, startsAt: futureDay(-3) }), "Start date can't be in the past");
  assert.equal(parseCouponInput({ code: "LAUNCH", kind: "percent", value: 20, startsAt: futureDay(10), expiresAt: futureDay(5) }), "Start date must be before the expiry date");
  const ok = parseCouponInput({ code: "LAUNCH", kind: "percent", value: 20, startsAt: futureDay(5), expiresAt: futureDay(5) });
  assert.notEqual(typeof ok, "string"); // same day: start (midnight) is before expiry (end of day), allowed
});

test("start date: metadata read and not-started message (legacy codes and boundary)", () => {
  assert.equal(codeStartsAt({}), null);
  assert.equal(codeStartsAt({ starts_at: "garbage" }), null);
  assert.equal(codeStartsAt(undefined), null);
  assert.equal(codeStartsAt({ starts_at: "1800000000" }), 1800000000);
  const t = Date.parse("2026-11-12T00:00:00+10:00") / 1000;
  const before = (t - 1) * 1000;
  assert.match(notStartedMessage("LAUNCH", t, before)!, /isn't active yet.*12 Nov 2026/);
  assert.equal(notStartedMessage("LAUNCH", t, t * 1000), null); // live at the exact start second
  assert.equal(notStartedMessage("LAUNCH", null), null);
});

test("start date: promo helper reads promo metadata first, falls back to coupon metadata", () => {
  const t = Math.floor(Date.now() / 1000) + 86400 * 3;
  assert.ok(promoNotStartedMessage({ code: "A", metadata: { starts_at: String(t) } }));
  assert.ok(promoNotStartedMessage({ code: "A", metadata: {}, promotion: { coupon: { metadata: { starts_at: String(t) } } } }));
  assert.equal(promoNotStartedMessage({ code: "A", metadata: {}, promotion: { coupon: "cou_1" } }), null);
  assert.equal(promoNotStartedMessage({ code: "A", metadata: { starts_at: String(t - 86400 * 10) } }), null);
});

import { hashCustomer, hasUsed, markUsed, type OnceStore } from "../lib/coupons/once";

const memStore = (): OnceStore & { data: Map<string, unknown> } => {
  const data = new Map<string, unknown>();
  return {
    data,
    async get(k) { return data.get(k) ?? null; },
    async set(k, v, o) { if (o?.nx && data.has(k)) return null; data.set(k, v); return "OK"; },
  };
};
const KEY = "test-secret";

test("once per customer: flag is parsed and stamped on coupon + promo metadata; off by default", () => {
  const on = parseCouponInput({ code: "ONCE10", kind: "percent", value: 10, oncePerCustomer: true });
  assert.ok(typeof on !== "string" && on.oncePerCustomer);
  const p = buildStripeParams(on, null);
  assert.equal((p.coupon.metadata as Record<string, string>).once_per_customer, "true");
  assert.equal((p.promo.metadata as Record<string, string>).once_per_customer, "true");
  const off = parseCouponInput({ code: "ONCE10", kind: "percent", value: 10 });
  assert.ok(typeof off !== "string" && !off.oncePerCustomer);
  assert.equal("once_per_customer" in (buildStripeParams(off as never, null).promo.metadata as object), false);
});

test("once per customer: reads the flag from promo or coupon metadata; legacy codes have none", () => {
  assert.equal(isOncePerCustomer({}), false);
  assert.equal(isOncePerCustomer(undefined), false);
  assert.equal(promoIsOnce({ metadata: {}, promotion: { coupon: { metadata: { once_per_customer: "true" } } } }), true);
  assert.equal(promoIsOnce({ metadata: { once_per_customer: "true" } }), true);
  assert.equal(promoIsOnce({ metadata: { target: "all" }, promotion: { coupon: "cou_1" } }), false);
});

test("once per customer: email normalisation (case, spaces, +tag) and rejects non-emails", () => {
  assert.equal(normaliseEmail("  Jane.Doe+Offer@Example.COM "), "jane.doe@example.com");
  assert.equal(normaliseEmail("a@b.co"), "a@b.co");
  assert.equal(normaliseEmail("not-an-email"), null);
  assert.equal(normaliseEmail(""), null);
  assert.equal(normaliseEmail(undefined), null);
});

test("once per customer: privacy, hash is keyed, stable across variants and never contains the email", () => {
  const h1 = hashCustomer("Jane+x@Example.com", KEY)!;
  assert.equal(h1, hashCustomer("jane@example.com", KEY));
  assert.match(h1, /^[0-9a-f]{32}$/);
  assert.ok(!h1.includes("jane") && !onceKey("promo_1", h1).includes("example"));
  assert.notEqual(h1, hashCustomer("jane@example.com", "other-secret"));
  assert.equal(hashCustomer("jane@example.com", ""), null); // no secret -> no tracking (fail open)
});

test("once per customer: first use allowed, second blocked, other email allowed, variants collide", async () => {
  const st = memStore();
  assert.equal(await hasUsed("promo_1", "jane@example.com", st, KEY), false);
  assert.equal(await markUsed("promo_1", "jane@example.com", "cs_1", st, KEY), "new");
  assert.equal(await hasUsed("promo_1", "Jane+deal@example.com", st, KEY), true);
  assert.equal(await hasUsed("promo_1", "sam@example.com", st, KEY), false);
  assert.equal(await hasUsed("promo_2", "jane@example.com", st, KEY), false); // per code
  // no raw email anywhere in storage
  for (const [k, v] of st.data) assert.ok(!k.includes("jane") && !JSON.stringify(v).includes("jane"));
});

test("once per customer: webhook retry is idempotent; a different session is flagged as a repeat", async () => {
  const st = memStore();
  assert.equal(await markUsed("promo_1", "jane@example.com", "cs_1", st, KEY), "new");
  assert.equal(await markUsed("promo_1", "jane@example.com", "cs_1", st, KEY), "same");
  assert.equal(await markUsed("promo_1", "jane@example.com", "cs_2", st, KEY), "repeat");
});

test("once per customer: fails open when storage or email is missing or broken", async () => {
  const broken: OnceStore = { async get() { throw new Error("down"); }, async set() { throw new Error("down"); } };
  assert.equal(await hasUsed("promo_1", "jane@example.com", broken, KEY), false);
  assert.equal(await markUsed("promo_1", "jane@example.com", "cs_1", broken, KEY), "skipped");
  assert.equal(await hasUsed("promo_1", "", memStore(), KEY), false);
  assert.equal(await markUsed("promo_1", undefined, "cs_1", memStore(), KEY), "skipped");
});

import { resolveHashKey } from "../lib/coupons/once";

test("hash key: dedicated secret wins when set and long enough", () => {
  const ded = "d".repeat(48);
  assert.equal(resolveHashKey({ COUPON_HASH_SECRET: ded, SAABAI_SESSION_SECRET: "session-secret" }), ded);
});

test("hash key: falls back to session secret when dedicated is unset or too short; none -> empty (fail open)", () => {
  assert.equal(resolveHashKey({ SAABAI_SESSION_SECRET: "session-secret" }), "session-secret");
  assert.equal(resolveHashKey({ COUPON_HASH_SECRET: "short", SAABAI_SESSION_SECRET: "session-secret" }), "session-secret");
  assert.equal(resolveHashKey({}), "");
  assert.equal(hashCustomer("jane@example.com", resolveHashKey({})), null);
});

test("hash key: different secrets give different keys; stored key holds no raw email", () => {
  const a = hashCustomer("jane@example.com", resolveHashKey({ COUPON_HASH_SECRET: "a".repeat(40) }))!;
  const b = hashCustomer("jane@example.com", resolveHashKey({ COUPON_HASH_SECRET: "b".repeat(40) }))!;
  assert.notEqual(a, b);
  assert.ok(!onceKey("promo_1", a).includes("jane") && !onceKey("promo_1", a).includes("example"));
});

test("hash key: store receives only the hash key, never the raw email", async () => {
  const seen: string[] = [];
  const store: OnceStore = { get: async (k) => { seen.push(k); return null; }, set: async (k, v) => { seen.push(k, JSON.stringify(v)); return "OK"; } };
  const key = "k".repeat(40);
  await markUsed("promo_1", "Jane@Example.com", "cs_1", store, key);
  assert.ok(seen.length > 0 && seen.every((x) => !/jane|example/i.test(x)));
});

import { couponSummary, pickerItems } from "../lib/coupons/picker";

test("payments picker: labels, scheduled greyed with start, product-only flagged, dead codes dropped", () => {
  const now = Date.parse("2026-10-19T00:00:00Z");
  const future = Math.floor(now / 1000) + 86400 * 5;
  const mk = (id: string, code: string, coupon: object, extra: object = {}) => ({ id, code, active: true, times_redeemed: 0, promotion: { coupon }, ...extra });
  const items = pickerItems([
    mk("p5", "ONLYBP", { percent_off: 10, duration: "once", applies_to: { products: ["prod_x"] } }),
    mk("p4", "LATER", { amount_off: 5000, duration: "once" }, { metadata: { starts_at: String(future) } }),
    mk("p1", "20STARTER", { percent_off: 20, duration: "forever" }),
    mk("p2", "WELCOME", { percent_off: 15, duration: "repeating", duration_in_months: 3 }),
    mk("d1", "OFF", { percent_off: 5 }, { active: false }),
    mk("d2", "OLD", { percent_off: 5 }, { expires_at: Math.floor(now / 1000) - 1 }),
    mk("d3", "FULL", { percent_off: 5 }, { max_redemptions: 2, times_redeemed: 2 }),
  ], now);
  assert.deepEqual(items.map((i) => [i.code, i.state]), [["20STARTER", "selectable"], ["WELCOME", "selectable"], ["LATER", "scheduled"], ["ONLYBP", "product"]]);
  assert.equal(items[0].label, "20STARTER - 20% off, recurring");
  assert.equal(items[1].label, "WELCOME - 15% off for 3 months");
  assert.equal(items[2].startsAt, future);
  assert.equal(items[0].startsAt, null);
  assert.equal(couponSummary({ amount_off: 5050, duration: "once" }), "$50.50 off, once");
  assert.equal(couponSummary({ amount_off: 5000 }), "$50 off, once");
});

test("a code whose start time has passed is selectable", () => {
  const now = Date.parse("2026-10-19T00:00:00Z");
  const [i] = pickerItems([{ id: "a", code: "GO", active: true, times_redeemed: 0, metadata: { starts_at: String(Math.floor(now / 1000) - 10) }, promotion: { coupon: { percent_off: 10, duration: "once" } } }], now);
  assert.equal(i.state, "selectable");
});
