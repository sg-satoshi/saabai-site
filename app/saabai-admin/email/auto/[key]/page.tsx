import { requireAdmin } from "../../../../../lib/require-admin";
import AdminShell from "../../../AdminSidebar";
import AutoEditor from "../AutoEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automated email" };

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin("/saabai-admin/email");
  const { key } = await params;
  return (
    <AdminShell activePath="/saabai-admin/email" title="Email / Tenant: SUNDER / Automated email">
      <AutoEditor emailKey={decodeURIComponent(key)} />
    </AdminShell>
  );
}
