import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import AdminShell from "../AdminSidebar";
import WholesaleLeadsClient from "./WholesaleLeadsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Wholesale Leads — Saabai" };

export default async function WholesaleLeadsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) redirect("/login?redirect=/saabai-admin/wholesale-leads");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/wholesale-leads");

  return (
    <AdminShell activePath="/saabai-admin/wholesale-leads">
      <WholesaleLeadsClient />
    </AdminShell>
  );
}
