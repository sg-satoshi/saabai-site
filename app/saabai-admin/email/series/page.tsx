import { requireAdmin } from "../../../../lib/require-admin";
import AdminShell from "../../AdminSidebar";
import Series from "./Series";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome series" };

export default async function Page() {
  await requireAdmin("/saabai-admin/email/series");
  return (
    <AdminShell activePath="/saabai-admin/email/series" title="Email / Tenant: SUNDER / Welcome series">
      <Series />
    </AdminShell>
  );
}
