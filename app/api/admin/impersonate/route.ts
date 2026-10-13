/**
 * POST /api/admin/impersonate  { email, name?, clientId?, returnTo? }
 * Start View as client (admin + 2FA verified). Sets impersonation cookie +
 * a short-lived portal_session for the target so GET routes resolve.
 *
 * DELETE /api/admin/impersonate  - exit, clear cookies, audit end.
 */
import { NextRequest } from "next/server";
import { signSession } from "../../../../lib/portal-session";
import {
  IMPERSONATE_TTL_SECONDS,
  clearImpersonationCookieHeader,
  clientIp,
  impersonationCookieHeader,
  requireAdminWith2fa,
  signImpersonation,
  verifyImpersonation,
  writeImpersonationAudit,
  IMPERSONATE_COOKIE,
} from "../../../../lib/impersonation";
import { findEligibleClient } from "../../../../lib/client-magic-link";
import { getPortalUser } from "../../../../lib/portal-users";
import { getDirectoryUser } from "../../../../lib/user-directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function portalSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `portal_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${IMPERSONATE_TTL_SECONDS}${secure}`;
}

function clearPortalSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `portal_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminWith2fa(req);
  if (!admin) {
    return Response.json(
      { error: "Admin session with verified 2FA required." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const nameIn = typeof body.name === "string" ? body.name.trim() : "";
  const clientIdIn = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const returnTo =
    typeof body.returnTo === "string" && body.returnTo.startsWith("/saabai-admin")
      ? body.returnTo
      : "/saabai-admin/customers";

  if (!email.includes("@") || email.length > 254) {
    return Response.json({ error: "Valid customer email required." }, { status: 400 });
  }

  const eligible = await findEligibleClient(email);
  const portalUser = await getPortalUser(email);
  const dirUser = await getDirectoryUser(email);
  const clientName =
    nameIn || eligible?.name || portalUser?.name || dirUser?.name || email.split("@")[0] || "Client";
  const clientId =
    clientIdIn || eligible?.clientId || portalUser?.id || dirUser?.id || `view-${email.slice(0, 24)}`;

  const { token, payload } = signImpersonation({
    adminId: admin.adminId,
    clientEmail: email,
    clientName,
    clientId,
    returnTo,
  });

  await writeImpersonationAudit({
    action: "start",
    adminId: payload.adminId,
    clientEmail: payload.clientEmail,
    clientName: payload.clientName,
    clientId: payload.clientId,
    sessionId: payload.sessionId,
    ip: clientIp(req),
  });

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", impersonationCookieHeader(token));
  headers.append("Set-Cookie", portalSessionCookie(signSession(email, IMPERSONATE_TTL_SECONDS * 1000)));

  return new Response(
    JSON.stringify({
      ok: true,
      redirect: "/client-portal",
      client: { email, name: clientName, clientId },
      expiresAt: new Date(payload.exp).toISOString(),
    }),
    { status: 200, headers },
  );
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminWith2fa(req);
  // Allow exit even if 2FA cookie expired mid-session, as long as admin session exists
  const token = req.cookies.get(IMPERSONATE_COOKIE)?.value;
  const imp = verifyImpersonation(token);

  if (imp) {
    await writeImpersonationAudit({
      action: "end",
      adminId: imp.adminId,
      clientEmail: imp.clientEmail,
      clientName: imp.clientName,
      clientId: imp.clientId,
      sessionId: imp.sessionId,
      ip: clientIp(req),
    });
  }

  if (!admin && !imp) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const returnTo = imp?.returnTo || "/saabai-admin/customers";
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", clearImpersonationCookieHeader());
  headers.append("Set-Cookie", clearPortalSessionCookie());

  return new Response(JSON.stringify({ ok: true, redirect: returnTo }), { status: 200, headers });
}
