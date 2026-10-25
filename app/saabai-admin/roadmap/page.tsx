import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import RoadmapClient from "./RoadmapClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  await requireAdmin("/saabai-admin/roadmap");
  return (
    <AdminShell activePath="/saabai-admin/roadmap">
      <RoadmapClient />
    </AdminShell>
  );
}
