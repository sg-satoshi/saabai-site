import { Suspense } from "react";
import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../../saabai-admin/AdminSidebar";
import PortalClient from "./portal-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Agent Portal - Saabai" };

export default async function Page() {
  // Admin-only: signed-out users go to the admin login, non-admins to /dashboard.
  await requireAdmin("/ai-agent/portal");

  return (
    <AdminShell activePath="/ai-agent/portal">
      <Suspense fallback={<div style={{ padding: 40, fontSize: 14, color: "#6b7280" }}>Loading portal…</div>}>
        <PortalClient />
      </Suspense>
    </AdminShell>
  );
}
