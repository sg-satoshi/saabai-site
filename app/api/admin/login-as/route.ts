/**
 * POST /api/admin/login-as  { userId }  (full admin only, 2FA trust honoured)
 * Starts a 1-hour "Login as" session for a non-admin directory user. See lib/login-as.ts.
 */
import { NextRequest } from "next/server";
import { COOKIE_NAME, createSessionToken, isAdminSession, isStaffSession } from "../../../../lib/auth";
import { listDirectoryUsers } from "../../../../lib/user-directory";
import { requireAdminWith2fa, writeImpersonationAudit, clientIp } from "../../../../lib/impersonation";
import { canLoginAs, signLoginAs, loginAsCookieHeaders, readLoginAs, LOGIN_AS_TTL_SECONDS } from "../../../../lib/login-as";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (readLoginAs(req)) return Response.json({ error: "Exit the current Login as session first." }, { status: 409 });
  const admin = await requireAdminWith2fa(req);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const adminToken = req.cookies.get(COOKIE_NAME)?.value;
  if (!adminToken) return Response.json({ error: "Forbidden" }, { status: 403 });

  let userId = "";
  try { userId = String((await req.json())?.userId ?? "").trim(); } catch { /* handled below */ }
  if (!userId) return Response.json({ error: "Pick a user." }, { status: 400 });

  const target = (await listDirectoryUsers()).find((u) => u.id === userId);
  if (!target) return Response.json({ error: "User not found." }, { status: 404 });
  if (!canLoginAs(target) || target.id === admin.adminId || (await isAdminSession(target.id)) || (await isStaffSession(target.id))) {
    return Response.json({ error: "Admins and staff cannot be viewed as." }, { status: 403 });
  }

  const name = target.name?.trim() || target.email;
  const { token, payload } = signLoginAs({ adminId: admin.adminId, adminToken, targetId: target.id, targetEmail: target.email, targetName: name });
  const userToken = await createSessionToken(target.id, LOGIN_AS_TTL_SECONDS);
  await writeImpersonationAudit({ action: "start", adminId: admin.adminId, clientEmail: payload.targetEmail, clientName: name, clientId: target.id, sessionId: payload.sessionId, ip: clientIp(req) });

  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json" });
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  headers.append("Set-Cookie", `${COOKIE_NAME}=${userToken}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${LOGIN_AS_TTL_SECONDS}`);
  for (const c of loginAsCookieHeaders(token, name)) headers.append("Set-Cookie", c);
  const dest = (target.products ?? []).length === 1 && target.products?.[0] === "lex" ? "/lex?view=dashboard" : target.dashboardUrl || "/dashboard";
  return new Response(JSON.stringify({ ok: true, redirect: dest, expiresAt: payload.exp }), { status: 200, headers });
}
