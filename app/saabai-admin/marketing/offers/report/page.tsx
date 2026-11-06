import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { couponReportEnabled } from "@/lib/coupons/report";
import { loadCouponReportRows } from "@/lib/coupons/report-load";
import AdminShell from "../../../AdminSidebar";
import CouponReportView from "./CouponReportView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupon report", robots: { index: false, follow: false } };

export default async function CouponReportPage() {
  await requireAdmin("/saabai-admin/marketing/offers/report");
  if (!couponReportEnabled()) notFound();
  const rows = await loadCouponReportRows();
  return (
    <AdminShell activePath="/saabai-admin/marketing/offers/report" title="Coupon report">
      <CouponReportView rows={rows} />
    </AdminShell>
  );
}
