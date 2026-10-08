/**
 * Route-level admin check (defense in depth on top of proxy.ts, which already
 * restricts /api/admin/* to the SAABAI_ADMIN_ID session).
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "./auth";

export async function requireAdminSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  if (!session) return false;
  return isAdminSession(session.clientId);
}
