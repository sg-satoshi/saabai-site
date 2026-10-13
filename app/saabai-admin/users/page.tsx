import { requireAdmin } from "../../../lib/require-admin";
import UsersClient from "./UsersClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "User Directory — Saabai" };

export default async function UsersPage() {
  await requireAdmin("/saabai-admin/users");

  return (
    <AdminShell activePath="/saabai-admin/users">
      <UsersClient />
    </AdminShell>
  );
}
