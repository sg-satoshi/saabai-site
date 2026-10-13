import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import SiteFactoryClient from "./SiteFactoryClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Site Factory - Saabai" };

export default async function SiteFactoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) redirect("/saabai-admin/login?redirect=/saabai-admin/site-factory");

  const session = await verifySessionToken(token);
  if (!session) redirect("/saabai-admin/login?redirect=/saabai-admin/site-factory");

  return (
    <AdminShell activePath="/saabai-admin/site-factory">
      <Suspense fallback={<div style={{ padding: 40, fontSize: 14, color: "#6b7280" }}>Loading Site Factory…</div>}>
        <SiteFactoryClient />
      </Suspense>
    </AdminShell>
  );
}
