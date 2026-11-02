import { requireAdmin } from "../../../../lib/require-admin";
import AdminShell from "../../AdminSidebar";
import Composer from "../Composer";

export const dynamic = "force-dynamic";
export const metadata = { title: "New broadcast" };

export default async function Page() {
  await requireAdmin("/saabai-admin/email/new");
  return (
    <AdminShell activePath="/saabai-admin/email/new" title="Email / Tenant: SUNDER / New broadcast">
      <Composer />
    </AdminShell>
  );
}
