import { requireAdmin } from "../../../../lib/require-admin";
import AdminShell from "../../AdminSidebar";
import Composer from "../Composer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Broadcast" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("/saabai-admin/email");
  const { id } = await params;
  return (
    <AdminShell activePath="/saabai-admin/email" title="Email / Tenant: SUNDER / Broadcast">
      <Composer campaignId={id} />
    </AdminShell>
  );
}
