import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import AnnouncementsClient from "./AnnouncementsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireAdmin("/saabai-admin/announcements");
  return (
    <AdminShell activePath="/saabai-admin/announcements">
      <AnnouncementsClient />
    </AdminShell>
  );
}
