import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, resolveStaff } from "./auth";
import { gate } from "./access";
import { isTotpEnrolled } from "./admin-2fa";
import { CHIEF_COOKIE, CHIEF_PAGES, verifyChiefToken } from "./chief";

/**
 * Server-side admin gate for /saabai-admin pages. Redirects to the admin
 * login when signed out, and to the client dashboard when signed in as a
 * non-staff. Full admins pass as before; restricted staff are checked against their grant. Returns the clientId.
 */
export async function requireAdmin(path: string): Promise<string> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session && CHIEF_PAGES.some((p) => path === p || path.startsWith(p + "/")) && (await verifyChiefToken((await cookies()).get(CHIEF_COOKIE)?.value))) return "chief";
  if (!session) redirect(`/saabai-admin/login?redirect=${encodeURIComponent(path)}`);
  const staff = await resolveStaff(session.clientId);
  if (!staff) redirect("/dashboard");
  if (staff.grant.role !== "admin") {
    // Restricted staff: same decision as proxy.ts (defense in depth for pages that fetch data server-side).
    const g = gate(staff.grant, "GET", path, await isTotpEnrolled(staff.id));
    if (g.action === "enrol") redirect("/saabai-admin/security?enrol=required");
    if (g.action === "deny") redirect("/saabai-admin?denied=1");
  }
  return session.clientId;
}
