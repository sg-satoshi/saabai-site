/**
 * GET /api/admin/coupons/report
 * Read-only per-coupon totals. Off unless COUPON_REPORT_ENABLED is 1 or true.
 * Does not call Stripe and does not write coupon, redemption or payment state.
 */
import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/product-stripe";
import { couponReportEnabled, couponReportHttp } from "../../../../../lib/coupons/report";
import { loadCouponReportRows } from "../../../../../lib/coupons/report-load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!couponReportEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await loadCouponReportRows();
  const res = couponReportHttp({ authed: true, enabled: true, rows });
  return NextResponse.json(res.body, { status: res.status });
}
