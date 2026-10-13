import { Suspense } from "react";
import { requireAdmin } from "../../../lib/require-admin";
import SiteFactoryClient from "./SiteFactoryClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Site Factory - Saabai" };

export default async function SiteFactoryPage() {
  await requireAdmin("/saabai-admin/site-factory");

  return (
    <AdminShell activePath="/saabai-admin/site-factory">
      <Suspense fallback={<div style={{ padding: 40, fontSize: 14, color: "#6b7280" }}>Loading Site Factory…</div>}>
        <SiteFactoryClient />
      </Suspense>
    </AdminShell>
  );
}
