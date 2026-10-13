import { requireAdmin } from "../../../lib/require-admin";
import CrmClient from "./CrmClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "CRM — Saabai" };

export default async function CrmPage() {
  await requireAdmin("/saabai-admin/crm");

  return (
    <AdminShell activePath="/saabai-admin/crm">
      <CrmClient />
    </AdminShell>
  );
}
