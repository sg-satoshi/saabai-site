import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
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
    redirect("/admin/login?redirect=/ai-agent/portal");
  }

  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text font-[family-name:var(--font-geist-sans)]">
      <Suspense fallback={<div className="pt-40 text-center text-saabai-text-dim">Loading portal…</div>}>
        <PortalClient />
      </Suspense>
    </div>
  );
}
