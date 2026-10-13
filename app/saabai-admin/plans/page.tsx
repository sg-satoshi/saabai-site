import { Suspense } from "react";
import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import PlansClient from "./PlansClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans & Add-ons" };

export default async function PlansPage() {
  await requireAdmin("/saabai-admin/plans");
  return (
    <AdminShell activePath="/saabai-admin/plans">
      <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
        <PlansClient />
      </Suspense>
    </AdminShell>
  );
}
