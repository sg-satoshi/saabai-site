import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import AdminShell from "../AdminSidebar";
import RequestsAdminClient from "./RequestsAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Client Requests — Saabai" };

export default async function AdminRequestsPage() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/requests");
  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/requests");
  if (!(await isAdminSession(session.clientId))) redirect("/saabai-admin");

  return (
    <AdminShell activePath="/saabai-admin/requests">
      <RequestsAdminClient />
    </AdminShell>
  );
}
