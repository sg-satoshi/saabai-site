import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import AdminShell from "../../saabai-admin/AdminSidebar";
import PortalClient from "./portal-client";

export const metadata = { title: "AI Agent Portal — Saabai" };

export default async function Page() {
  // ADMIN-gated: only an authenticated admin (or a directory admin) may use this.
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  let session: { clientId: string } | null = null;
  if (token) {
    try {
      session = await verifySessionToken(token);
    } catch {
      session = null;
    }
  }
  if (!session || !(await isAdminSession(session.clientId))) {
    redirect("/login?redirect=/ai-agent/portal");
  }

  return (
    <AdminShell activePath="/ai-agent/portal">
      <Suspense fallback={<div style={{ padding: 40, fontSize: 14, color: "#6b7280" }}>Loading portal…</div>}>
        <PortalClient />
      </Suspense>
    </AdminShell>
  );
}
