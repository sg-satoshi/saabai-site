import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import ScanClient from "./ScanClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Website scanner" };

export default async function WebsiteScanPage() {
  await requireAdmin("/saabai-admin/website-scan");
  return (
    <AdminShell activePath="/saabai-admin/website-scan">
      <ScanClient />
    </AdminShell>
  );
}
