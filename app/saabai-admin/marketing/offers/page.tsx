import { requireAdmin } from "@/lib/require-admin";
import AdminShell from "../../AdminSidebar";
import OffersClient from "./OffersClient";
import "./offers.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offers & Coupons", robots: { index: false, follow: false } };

export default async function OffersPage() {
  await requireAdmin("/saabai-admin/marketing/offers");
  return (
    <AdminShell activePath="/saabai-admin/marketing/offers">
      <OffersClient />
    </AdminShell>
  );
}
