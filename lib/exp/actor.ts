import { cookies } from "next/headers";
import { CHIEF_COOKIE, verifyChiefToken } from "../chief";
import { COOKIE_NAME, verifySessionToken } from "../auth";
import { isAdminOrGranted } from "../auth-acl";

/** Returns the admin's session id (for audit rows) or null. Defense in depth on top of proxy.ts (/api/admin is admin-only). */
export async function adminActor(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const s = await verifySessionToken(token);
  if (!s || !(await isAdminOrGranted(s.clientId))) return null;
  return s.clientId;
}

/** READ-ONLY routes only: an admin, or the Chief read-only session. Never use this for writes. */
export async function readActor(): Promise<string | null> {
  const a = await adminActor();
  if (a) return a;
  return (await verifyChiefToken((await cookies()).get(CHIEF_COOKIE)?.value)) ? "chief" : null;
}
