import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import ExperimentsClient from "./ExperimentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Experiments" };

export default async function ExperimentsPage() {
  await requireAdmin("/saabai-admin/experiments");
  return (
    <AdminShell activePath="/saabai-admin/experiments">
      <ExperimentsClient />
    </AdminShell>
  );
}
