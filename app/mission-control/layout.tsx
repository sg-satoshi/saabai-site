import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../lib/auth";

// Server-side gate: Mission Control is admin-only. Sign in with the normal
// Saabai admin login; there is no separate PIN.
export const dynamic = "force-dynamic";
export const metadata = { title: "Mission Control | Saabai" };

export default async function MissionControlLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) redirect("/login?redirect=/mission-control");
  if (!(await isAdminSession(session.clientId))) redirect("/dashboard");
  return children;
}
