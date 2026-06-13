import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import CrmClient from "./CrmClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "CRM — Saabai" };

export default async function CrmPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/crm");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/crm");

  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) redirect("/saabai-admin");

  return (
    <AdminShell activePath="/saabai-admin/crm">
      <CrmClient />
    </AdminShell>
  );
}
