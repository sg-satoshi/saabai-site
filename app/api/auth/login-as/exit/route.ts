/**
 * POST /api/auth/login-as/exit  End a "Login as" session and restore the admin's own session.
 * Not under /api/admin: the browser holds the viewed user's session while this runs.
 */
import { COOKIE_NAME, clearSessionCookieHeader, isAdminSession, verifySessionToken } from "../../../../../lib/auth";
import { writeImpersonationAudit, clientIp } from "../../../../../lib/impersonation";
import { clearLoginAsCookieHeaders, readLoginAs } from "../../../../../lib/login-as";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const c of clearLoginAsCookieHeaders()) headers.append("Set-Cookie", c);
  const m = readLoginAs(req);
  const adminOk = m ? await verifySessionToken(m.adminToken) : null;
  if (!m || !adminOk || adminOk.clientId !== m.adminId || !(await isAdminSession(m.adminId))) {
    // Expired or tampered: sign out fully rather than leave the viewed user's session behind.
    headers.append("Set-Cookie", clearSessionCookieHeader());
    headers.set("Location", "/saabai-admin/login");
    return new Response(null, { status: 303, headers });
  }
  await writeImpersonationAudit({ action: "end", adminId: m.adminId, clientEmail: m.targetEmail, clientName: m.targetName, clientId: m.targetId, sessionId: m.sessionId, ip: clientIp(req) });
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  headers.append("Set-Cookie", `${COOKIE_NAME}=${m.adminToken}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${7 * 24 * 3600}`);
  headers.set("Location", "/saabai-admin/users");
  return new Response(null, { status: 303, headers });
}
