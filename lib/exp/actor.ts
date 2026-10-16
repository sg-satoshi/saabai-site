import { cookies } from "next/headers";
import { COOKIE_NAME, isAdminSession, verifySessionToken } from "../auth";

/** Returns the admin's session id (for audit rows) or null. Defense in depth on top of proxy.ts (/api/admin is admin-only). */
export async function adminActor(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const s = await verifySessionToken(token);
  if (!s || !(await isAdminSession(s.clientId))) return null;
  return s.clientId;
}
