import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import SiteFactoryClient from "./SiteFactoryClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Site Factory — Saabai" };

export default async function SiteFactoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Any authenticated user can access Site Factory
  if (!token) redirect("/login?redirect=/saabai-admin/site-factory");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/site-factory");

  return (
    <AdminShell activePath="/saabai-admin/site-factory">
      <SiteFactoryClient />
    </AdminShell>
  );
}
