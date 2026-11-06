import { requireAdmin } from "../../../../lib/require-admin";
import AdminShell from "../../AdminSidebar";
import Subscribers from "./Subscribers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email subscribers" };

export default async function Page() {
  await requireAdmin("/saabai-admin/email/subscribers");
  return (
    <AdminShell activePath="/saabai-admin/email/subscribers" title="Email / Tenant: SUNDER / Subscribers">
      <Subscribers />
    </AdminShell>
  );
}
