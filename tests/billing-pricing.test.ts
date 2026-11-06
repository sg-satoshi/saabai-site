import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { billedUnit, ensurePrice, gstNote, lineTotals, priceLookupKey, priceMatches, validateLine } from "../lib/billing/price-lines";
import { planCollection } from "../lib/billing/collect";
import { SubmissionKey, httpOutcome } from "../lib/billing/request-id";
import { catalogueItems, intervalFromRecurring, stripeItems, validPickerKey } from "../lib/billing/picker";

const L = (o: Record<string, unknown>) => { const r = validateLine({ description: "Work", unitAmount: 10000, ...o }); assert.ok(r.line, r.error); return r.line!; };

test("line totals with percent and amount discounts, never negative", () => {
  assert.deepEqual(lineTotals(L({ quantity: 3 })), { gross: 30000, discount: 0, net: 30000 });
  assert.deepEqual(lineTotals(L({ quantity: 3, discount: { kind: "percent", value: 10 } })), { gross: 30000, discount: 3000, net: 27000 });
  assert.deepEqual(lineTotals(L({ quantity: 2, discount: { kind: "amount", value: 2500 } })), { gross: 20000, discount: 2500, net: 17500 });
  assert.equal(lineTotals({ unitAmount: 100, quantity: 1, discount: { kind: "amount", value: 999 } }).net, 0);
  assert.equal(lineTotals(L({ quantity: 3, discount: { kind: "percent", value: 33.333 } })).net, 20000);
});

test("billed unit keeps quantity when the net splits evenly, else bills one unit of the total", () => {
  assert.deepEqual(billedUnit(L({ quantity: 3, discount: { kind: "percent", value: 10 } })), { unitAmount: 9000, quantity: 3, description: "Work" });
  const odd = billedUnit(L({ unitAmount: 1000, quantity: 3, discount: { kind: "amount", value: 100 } }));
  assert.deepEqual(odd, { unitAmount: 2900, quantity: 1, description: "Work x 3" });
});

test("line validation", () => {
  assert.match(validateLine({ description: "", unitAmount: 1000 }).error!, /Description/);
  assert.match(validateLine({ description: "x", unitAmount: 10 }).error!, /Amount/);
  assert.match(validateLine({ description: "x", unitAmount: 1000, interval: "daily" }).error!, /interval/);
  assert.match(validateLine({ description: "x", unitAmount: 1000, discount: { kind: "percent", value: 120 } }).error!, /100/);
  assert.match(validateLine({ description: "x", unitAmount: 1000, discount: { kind: "amount", value: 2000 } }).error!, /exceed/);
  assert.match(validateLine({ description: "x", unitAmount: 1000, source: "stripe", refId: "bogus" }).error!, /Stripe price/);
  const l = L({ gstMode: "inclusive" });
  assert.equal(l.gstMode, "inclusive");
  assert.equal(gstNote(l.gstMode), "GST not applicable");
  assert.equal(L({ gstMode: "weird" }).gstMode, "none");
});

function fakePrices(existing: Record<string, unknown>[]) {
  const calls: string[] = [];
  const stripe = {
    prices: {
      retrieve: async (id: string) => { calls.push(`retrieve:${id}`); const p = existing.find((x) => x.id === id); if (!p) throw new Error("none"); return p; },
      list: async ({ lookup_keys }: { lookup_keys: string[] }) => { calls.push(`list:${lookup_keys[0]}`); return { data: existing.filter((x) => x.lookup_key === lookup_keys[0]) }; },
      create: async (p: { lookup_key: string }, o: { idempotencyKey: string }) => { calls.push(`create:${p.lookup_key}:${!!o.idempotencyKey}`); return { id: "price_new" }; },
    },
  };
  return { stripe: stripe as never, calls };
}

test("price reuse: matching line price, then lookup_key, then create with lookup_key", async () => {
  const monthly = { id: "price_m", active: true, product: "prod_a", unit_amount: 5000, currency: "aud", recurring: { interval: "month", interval_count: 1 }, lookup_key: priceLookupKey("prod_a", 5000, "monthly") };
  let f = fakePrices([monthly]);
  assert.deepEqual(await ensurePrice(f.stripe, { productId: "prod_a", unitAmount: 5000, interval: "monthly", candidatePriceId: "price_m", clientId: "bc_1", idemKey: "k" }), { priceId: "price_m", via: "line" });
  f = fakePrices([monthly]);
  assert.deepEqual(await ensurePrice(f.stripe, { productId: "prod_a", unitAmount: 5000, interval: "monthly", clientId: "bc_1", idemKey: "k" }), { priceId: "price_m", via: "lookup" });
  assert.ok(!f.calls.some((c) => c.startsWith("create")));
  // A discounted amount does not reuse the full-price Price; quarterly does not reuse monthly.
  f = fakePrices([monthly]);
  assert.equal((await ensurePrice(f.stripe, { productId: "prod_a", unitAmount: 4500, interval: "monthly", candidatePriceId: "price_m", clientId: "bc_1", idemKey: "k" })).via, "created");
  assert.ok(f.calls.includes(`create:${priceLookupKey("prod_a", 4500, "monthly")}:true`));
  assert.equal(priceMatches(monthly as never, "prod_a", 5000, "quarterly"), false);
  assert.equal(priceMatches(monthly as never, "prod_a", 5000, "once"), false);
  assert.equal(priceMatches({ ...monthly, active: false } as never, "prod_a", 5000, "monthly"), false);
});

test("collection plans check lines against the method", () => {
  const once = { ...L({}), id: "pl_aaaaaaaa1" };
  const mon = { ...L({ interval: "monthly" }), id: "pl_aaaaaaaa2" };
  const yr = { ...L({ interval: "yearly" }), id: "pl_aaaaaaaa3" };
  assert.match(planCollection([mon], "invoice").error!, /one-off/);
  assert.match(planCollection([once], "subscription_invoice").error!, /recurring/);
  assert.match(planCollection([mon, yr], "checkout_link").error!, /one billing interval/);
  assert.match(planCollection([], "card_now").error!, /at least one/);
  const ok = planCollection([once, mon], "subscription_invoice");
  assert.equal(ok.error, undefined);
  assert.equal(ok.totalCents, 20000);
  assert.equal(ok.interval, "monthly");
});

test("picker: catalogue and Stripe items, admin toggle, unsupported prices skipped", () => {
  const enabled = new Set(["cat:p1", "stripe:price_b"]);
  const cat = catalogueItems([
    { id: "p1", name: "Site", active: true, billingType: "setup_monthly", recurringAmount: 9900, setupFee: 50000, interval: "monthly", stripeProductId: "prod_s" },
    { id: "p2", name: "Old", active: false, billingType: "one_time", oneTimeAmount: 100, stripeProductId: "prod_o" },
  ] as never, enabled);
  assert.equal(cat.length, 1);
  assert.deepEqual([cat[0].unitAmount, cat[0].setupAmount, cat[0].interval, cat[0].enabled], [9900, 50000, "monthly", true]);
  const st = stripeItems([
    { id: "price_b", active: true, currency: "aud", unit_amount: 2000, nickname: null, recurring: null, product: { id: "prod_b", name: "Audit", active: true } },
    { id: "price_usd", active: true, currency: "usd", unit_amount: 2000, nickname: null, recurring: null, product: "prod_c" },
    { id: "price_daily", active: true, currency: "aud", unit_amount: 2000, nickname: null, recurring: { interval: "day", interval_count: 1 }, product: "prod_c" },
    { id: "price_meter", active: true, currency: "aud", unit_amount: null, nickname: null, recurring: null, product: "prod_c" },
  ] as never, enabled);
  assert.deepEqual(st.map((s) => [s.key, s.name, s.enabled]), [["stripe:price_b", "Audit", true]]);
  assert.equal(intervalFromRecurring({ interval: "week", interval_count: 2 }), "fortnightly");
  assert.ok(validPickerKey("cat:p1") && validPickerKey("stripe:price_b"));
  assert.ok(!validPickerKey("stripe:prod_x") && !validPickerKey("cat:../x"));
});

test("Phase B routes are full-admin only; collect requires a requestId; every Stripe create is idempotent", () => {
  const routes = ["app/api/admin/payments/products/route.ts", "app/api/admin/billing-clients/[id]/lines/route.ts", "app/api/admin/billing-clients/[id]/collect/route.ts"];
  for (const r of routes) {
    const src = readFileSync(r, "utf8");
    const handlers = src.match(/export async function (GET|PUT|POST)/g) || [];
    const gates = src.match(/return moneyDeny\(\)/g) || [];
    assert.ok(handlers.length > 0 && gates.length >= handlers.length, `${r}: every handler gated`);
    assert.ok(!src.includes("isAdminRequest") && !src.includes("isAdminOrGranted"), `${r}: no granted staff`);
  }
  const collectRoute = readFileSync("app/api/admin/billing-clients/[id]/collect/route.ts", "utf8");
  assert.match(collectRoute, /requireRequestId\(body\)/);
  for (const f of ["lib/billing/collect.ts", "lib/billing/price-lines.ts"]) {
    const src = readFileSync(f, "utf8");
    const creates = src.match(/\.(create|finalizeInvoice|sendInvoice)\([\s\S]*?\);/g) || [];
    assert.ok(creates.length > 0);
    for (const c of creates) assert.ok(/idempotencyKey/.test(c), `${f}: ${c.slice(0, 80)}`);
  }
});

test("Phase B UI: no em dashes, no gold, GST not applicable shown", () => {
  const src = readFileSync("app/saabai-admin/payments/PricingTab.tsx", "utf8");
  assert.ok(!src.includes("\u2014"));
  assert.ok(!/gold|#c9a|#d4af/i.test(src));
  assert.ok(src.includes("GST not applicable"));
});

test("pricing tab collect: keeps the request id after a 502 or network error, renews after a definite 4xx or success", () => {
  const src = readFileSync("app/saabai-admin/payments/PricingTab.tsx", "utf8");
  const take = src.slice(src.indexOf("async function take("), src.indexOf("const chosen ="));
  assert.ok(!take.includes("renew()"), "collect never renews unconditionally");
  assert.match(take, /outcome = httpOutcome\(res\.status\)/);
  assert.match(take, /finally \{ subKey\.current\.settle\(outcome\)/);
  const route = readFileSync("app/api/admin/billing-clients/[id]/collect/route.ts", "utf8");
  assert.match(route, /CollectError \? 400 : 502/, "Stripe failures are ambiguous (502), validation is 400");

  // Simulate the take() flow with the same payload.
  let n = 0;
  const k = new SubmissionKey(() => `rid${++n}bbbbb`);
  const payload = { clientId: "c1", method: "send_invoice", lineIds: ["l1"], days: 14 };
  const first = k.key(payload);
  k.settle(httpOutcome(502)); // Stripe may have created and emailed the invoice
  assert.equal(k.key(payload), first, "retry after a 502 reuses the key");
  k.settle("ambiguous"); // fetch threw: network error, timeout or abort
  assert.equal(k.key(payload), first, "retry after a network error reuses the key");
  k.settle(httpOutcome(400));
  const second = k.key(payload);
  assert.notEqual(second, first, "retry after a definite 400 gets a new key");
  k.settle("success");
  assert.notEqual(k.key(payload), second, "a genuine second collection gets a new key");
});

test("checkout from the pricing tab returns to a thank-you page, not the homepage", () => {
  const src = readFileSync("lib/billing/collect.ts", "utf8");
  assert.match(src, /success_url: `\$\{SITE\}\/pay\/thanks\?status=success`/);
  assert.match(src, /cancel_url: `\$\{SITE\}\/pay\/thanks\?status=cancelled`/);
});
