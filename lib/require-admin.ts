import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "./auth";
import { CHIEF_COOKIE, CHIEF_PAGES, verifyChiefToken } from "./chief";

/**
 * Server-side admin gate for /saabai-admin pages. Redirects to the admin
 * login when signed out, and to the client dashboard when signed in as a
 * non-admin. Returns the admin clientId.
 */
export async function requireAdmin(path: string): Promise<string> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session && CHIEF_PAGES.some((p) => path === p || path.startsWith(p + "/")) && (await verifyChiefToken((await cookies()).get(CHIEF_COOKIE)?.value))) return "chief";
  if (!session) redirect(`/saabai-admin/login?redirect=${encodeURIComponent(path)}`);
  if (!(await isAdminSession(session.clientId))) redirect("/dashboard");
  return session.clientId;
}
