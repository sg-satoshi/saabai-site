import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import AdminShell from "../AdminSidebar";
import ChangeLogClient from "./ChangeLogClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Change log — Saabai" };

export default async function ChangeLogPage() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) redirect("/saabai-admin/login?redirect=/saabai-admin/change-log");
  const session = await verifySessionToken(token);
  if (!session) redirect("/saabai-admin/login?redirect=/saabai-admin/change-log");
  if (!(await isAdminSession(session.clientId))) redirect("/saabai-admin");

  return (
    <AdminShell activePath="/saabai-admin/change-log">
      <ChangeLogClient />
    </AdminShell>
  );
}
