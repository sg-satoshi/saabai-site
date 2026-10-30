/**
 * Verified session for a request: the Saabai session token, or a portal (law-firm) magic-link session.
 * Shared by proxy.ts and routes that must apply the exact same check (e.g. POST /api/lex/signup).
 * Verifies signatures and expiry; cookie presence alone never counts.
 */
import type { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "./auth";
import { verifySession } from "./portal-session";

export async function getRequestSession(req: NextRequest): Promise<{ clientId: string; email?: string } | null> {
  // Primary: Saabai admin/client session (clientId can equal SAABAI_ADMIN_ID).
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) return session;
  }
  // Portal session (law-firm clients via magic link). Never admin: the clientId is namespaced
  // so it can't match SAABAI_ADMIN_ID. Portal/Lex routes still do their own per-user checks.
  const portal = req.cookies.get("portal_session")?.value;
  if (portal) {
    const s = verifySession(portal);
    if (s?.email) return { clientId: `portal:${s.email}`, email: s.email };
  }
  return null;
}
