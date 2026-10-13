import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import WholesaleLeadsClient from "./WholesaleLeadsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Wholesale Leads — Saabai" };

export default async function WholesaleLeadsPage() {
  await requireAdmin("/saabai-admin/wholesale-leads");

  return (
    <AdminShell activePath="/saabai-admin/wholesale-leads">
      <WholesaleLeadsClient />
    </AdminShell>
  );
}
