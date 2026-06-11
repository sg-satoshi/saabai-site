/**
 * Admin-session guard for AI Audit API routes.
 */

import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "./auth";

export async function requireAdmin(): Promise<
  { ok: true; clientId: string } | { ok: false; response: Response }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false, response: Response.json({ error: "Unauthorised" }, { status: 401 }) };
  }
  const session = await verifySessionToken(token);
  if (!session) {
    return { ok: false, response: Response.json({ error: "Unauthorised" }, { status: 401 }) };
  }
  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, clientId: session.clientId };
}
