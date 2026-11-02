import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import Campaigns from "./Campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

export default async function Page() {
  await requireAdmin("/saabai-admin/email");
  return (
    <AdminShell activePath="/saabai-admin/email" title="Email / Tenant: SUNDER / Campaigns">
      <Campaigns />
    </AdminShell>
  );
}
