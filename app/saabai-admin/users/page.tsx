import { requireAdmin } from "../../../lib/require-admin";
import UsersClient from "./UsersClient";
import AdminShell from "../AdminSidebar";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken, isAdminSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "User Directory — Saabai" };

export default async function UsersPage() {
  await requireAdmin("/saabai-admin/users");
  // Login as is for full admins only (the API enforces this too).
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const canLoginAs = !!session && (await isAdminSession(session.clientId));

  return (
    <AdminShell activePath="/saabai-admin/users">
      <UsersClient canLoginAs={canLoginAs} />
    </AdminShell>
  );
}
