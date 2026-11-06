import { requireAdmin } from "../../../../lib/require-admin";
import AdminShell from "../../AdminSidebar";
import Health from "./Health";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sending health" };

export default async function Page() {
  await requireAdmin("/saabai-admin/email/health");
  return (
    <AdminShell activePath="/saabai-admin/email/health" title="Email / Tenant: SUNDER / Sending health">
      <Health />
    </AdminShell>
  );
}
