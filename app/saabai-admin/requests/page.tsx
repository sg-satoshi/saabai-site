import { Suspense } from "react";
import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import RequestsAdminClient from "./RequestsAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Client Requests — Saabai" };

export default async function AdminRequestsPage() {
  await requireAdmin("/saabai-admin/requests");

  return (
    <AdminShell activePath="/saabai-admin/requests">
      <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
        <RequestsAdminClient />
      </Suspense>
    </AdminShell>
  );
}
