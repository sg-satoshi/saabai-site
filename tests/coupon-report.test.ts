import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CouponReportView from "../app/saabai-admin/marketing/offers/report/CouponReportView";
import {
  collectStoredRedemptions,
  couponReport,
  couponReportEnabled,
  couponReportHttp,
  filterCouponReport,
} from "../lib/coupons/report";

test("flag off by default", () => {
  assert.equal(couponReportEnabled({}), false);
  assert.equal(couponReportEnabled({ COUPON_REPORT_ENABLED: "" }), false);
  assert.equal(couponReportEnabled({ COUPON_REPORT_ENABLED: "0" }), false);
  assert.equal(couponReportEnabled({ COUPON_REPORT_ENABLED: "false" }), false);
  assert.equal(couponReportEnabled({ COUPON_REPORT_ENABLED: "yes" }), false);
});

test("flag on for 1 or true", () => {
  assert.equal(couponReportEnabled({ COUPON_REPORT_ENABLED: "1" }), true);
  assert.equal(couponReportEnabled({ COUPON_REPORT_ENABLED: "true" }), true);
  assert.equal(couponReportEnabled({ COUPON_REPORT_ENABLED: " TRUE " }), true);
});

test("aggregates per code", () => {
  const r = couponReport([{ code: "save10", discountCents: 1000 }, null, { code: "SAVE10", discountCents: 500 }, { couponId: "c1", discountCents: 200 }]);
  assert.deepEqual(r, [{ code: "SAVE10", uses: 2, discountCents: 1500 }, { code: "C1", uses: 1, discountCents: 200 }]);
});

test("trims codes, drops negative discounts, and sorts ties by uses then code", () => {
  const r = couponReport([
    { code: "  b  ", discountCents: 100 },
    { code: "a", discountCents: 100 },
    { code: "a", discountCents: 100 },
    { code: "neg", discountCents: -40 },
    { promotionCodeId: "promo_z", discountCents: 0 },
  ]);
  assert.deepEqual(r, [
    { code: "A", uses: 2, discountCents: 200 },
    { code: "B", uses: 1, discountCents: 100 },
    { code: "NEG", uses: 1, discountCents: 0 },
    { code: "PROMO_Z", uses: 1, discountCents: 0 },
  ]);
});

test("same checkout is counted once, and a care plan row is skipped when the event already has it", () => {
  const rows = collectStoredRedemptions({
    events: [
      { refId: "cs_1", contactId: "A@x.com", meta: { coupon: "save10", discountCents: 1000 } },
      { refId: "cs_1", contactId: "a@x.com", meta: { coupon: "SAVE10", discountCents: 1000 } },
      { refId: "cs_2", contactId: "b@x.com", meta: { coupon: "vip", discountCents: 250 } },
    ],
    engagements: [
      { stripeRef: "cs_1", contactEmail: "a@x.com", couponCode: "SAVE10", discountCents: 1000 },
      { stripeRef: "cs_9", contactEmail: "c@x.com", couponCode: "blue", discountCents: 500 },
    ],
    billing: [
      { contactEmail: "a@x.com", couponCode: "SAVE10", discountCents: 1000, checkoutSessionId: "cs_open" },
      { contactEmail: "d@x.com", couponCode: "care", discountCents: 300 },
    ],
  });
  assert.deepEqual(couponReport(rows), [
    { code: "SAVE10", uses: 1, discountCents: 1000 },
    { code: "BLUE", uses: 1, discountCents: 500 },
    { code: "CARE", uses: 1, discountCents: 300 },
    { code: "VIP", uses: 1, discountCents: 250 },
  ]);
});

test("a care plan row is kept when no checkout event saved that use", () => {
  const rows = collectStoredRedemptions({
    events: [{ refId: "cs_1", contactId: "a@x.com", meta: { coupon: "other", discountCents: 100 } }],
    billing: [{ contactEmail: "a@x.com", couponCode: "care", discountCents: 400 }],
  });
  assert.deepEqual(couponReport(rows), [
    { code: "CARE", uses: 1, discountCents: 400 },
    { code: "OTHER", uses: 1, discountCents: 100 },
  ]);
});

test("filter matches the code only", () => {
  const rows = couponReport([{ code: "SAVE10", discountCents: 100 }, { code: "VIP", discountCents: 50 }]);
  assert.deepEqual(filterCouponReport(rows, " sav ").map((r) => r.code), ["SAVE10"]);
  assert.equal(filterCouponReport(rows, "  ").length, 2);
});

test("flag off and signed out responses do not include the report", () => {
  const rows = couponReport([{ code: "SAVE10", discountCents: 1000 }]);
  const off = couponReportHttp({ authed: true, enabled: false, rows });
  assert.equal(off.status, 404);
  assert.deepEqual(off.body, { error: "Not found" });
  assert.equal("rows" in off.body, false);

  const signedOut = couponReportHttp({ authed: false, enabled: true, rows });
  assert.equal(signedOut.status, 403);
  assert.deepEqual(signedOut.body, { error: "Forbidden" });
  assert.equal("rows" in signedOut.body, false);

  const on = couponReportHttp({ authed: true, enabled: true, rows });
  assert.equal(on.status, 200);
  assert.deepEqual(on.body, { rows, codes: 1, uses: 1, discountCents: 1000 });
});

test("report view shows saved totals and an empty state", () => {
  const html = renderToStaticMarkup(React.createElement(CouponReportView, { rows: [{ code: "SAVE10", uses: 2, discountCents: 1500 }] }));
  assert.match(html, /SAVE10/);
  assert.match(html, /Filter by code/);
  assert.match(html, /Read only/);
  assert.equal(/[\u2012-\u2015]/.test(html), false);
  const empty = renderToStaticMarkup(React.createElement(CouponReportView, { rows: [] }));
  assert.match(empty, /No saved redemptions yet/);
});

test("report route, page and loader stay read only and flag gated", () => {
  const route = readFileSync("app/api/admin/coupons/report/route.ts", "utf8");
  const page = readFileSync("app/saabai-admin/marketing/offers/report/page.tsx", "utf8");
  const load = readFileSync("lib/coupons/report-load.ts", "utf8");
  const view = readFileSync("app/saabai-admin/marketing/offers/report/CouponReportView.tsx", "utf8");
  const offers = readFileSync("app/saabai-admin/marketing/offers/page.tsx", "utf8");
  const side = readFileSync("app/saabai-admin/AdminSidebar.tsx", "utf8");
  for (const src of [route, page, load, view, offers, side]) assert.equal(/[\u2012-\u2015]/.test(src), false);
  assert.match(route, /if \(!couponReportEnabled\(\)\) return NextResponse\.json\(\{ error: "Not found" \}, \{ status: 404 \}\)/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(page, /if \(!couponReportEnabled\(\)\) notFound\(\)/);
  assert.match(offers, /couponReportEnabled\(\) \? "\/saabai-admin\/marketing\/offers\/report" : undefined/);
  assert.match(side, /if \(!reportOn\) return NAV/);
  for (const src of [route, load, page]) {
    assert.doesNotMatch(src, /getStripe|from ["']stripe["']|promotionCodes|coupons\.create|promotionCodes\.update/);
  }
});
