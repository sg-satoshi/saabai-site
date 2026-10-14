import { requireAdmin } from "@/lib/require-admin";
import AdminShell from "../../AdminSidebar";
import PulseApp from "./PulseApp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pulse", robots: { index: false, follow: false } };

export default async function PulsePage() {
  await requireAdmin("/saabai-admin/marketing/pulse");
  return (
    <AdminShell activePath="/saabai-admin/marketing/pulse">
      <PulseApp />
    </AdminShell>
  );
}
