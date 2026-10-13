import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import ChangeLogClient from "./ChangeLogClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Change log — Saabai" };

export default async function ChangeLogPage() {
  await requireAdmin("/saabai-admin/change-log");

  return (
    <AdminShell activePath="/saabai-admin/change-log">
      <ChangeLogClient />
    </AdminShell>
  );
}
