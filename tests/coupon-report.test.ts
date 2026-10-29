import { test } from "node:test";
import assert from "node:assert/strict";
import { couponReport, couponReportEnabled } from "../lib/coupons/report";

test("flag off by default", () => assert.equal(couponReportEnabled({}), false));
test("aggregates per code", () => {
  const r = couponReport([{ code: "save10", discountCents: 1000 }, null, { code: "SAVE10", discountCents: 500 }, { couponId: "c1", discountCents: 200 }]);
  assert.deepEqual(r, [{ code: "SAVE10", uses: 2, discountCents: 1500 }, { code: "C1", uses: 1, discountCents: 200 }]);
});
