import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "./auth";

/**
 * Server-side admin gate for /saabai-admin pages. Redirects to the admin
 * login when signed out, and to the client dashboard when signed in as a
 * non-admin. Returns the admin clientId.
 */
export async function requireAdmin(path: string): Promise<string> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) redirect(`/saabai-admin/login?redirect=${encodeURIComponent(path)}`);
  if (!(await isAdminSession(session.clientId))) redirect("/dashboard");
  return session.clientId;
}
