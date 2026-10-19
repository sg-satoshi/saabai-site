import { type NextRequest } from "next/server";
import { createSessionToken, sessionCookieHeader, isStaffSession, resolveStaff } from "../../../../../lib/auth";
import {
  PENDING_COOKIE,
  verifyPendingToken,
  checkLoginCode,
  clearPendingCookieHeader,
  isTwoFactorEnabled,
  isTotpEnrolled,
  createTrustToken,
  trustCookieHeader,
} from "../../../../../lib/admin-2fa";
import { recordLogin } from "../../../../../lib/login-stamp";
import { safeRedirect } from "../../../../../lib/safe-redirect";

export const runtime = "nodejs";

/** Second login step: swap the pending cookie plus a TOTP or backup code for a full session. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code = form.get("code")?.toString() ?? "";
  const trust = form.get("trust")?.toString() === "1" || form.get("trust")?.toString() === "on";
  const pending = verifyPendingToken(req.cookies.get(PENDING_COOKIE)?.value);

  if (!pending || !(await isStaffSession(pending.clientId))) {
    const u = new URL("/saabai-admin/login", req.url);
    u.searchParams.set("error", "expired");
    return new Response(null, { status: 303, headers: { Location: u.toString(), "Set-Cookie": clearPendingCookieHeader() } });
  }

  // Restricted accounts can never skip the code step (the env break-glass only applies to full admins).
  const restricted = (await resolveStaff(pending.clientId))?.grant.role !== "admin";
  const needCode = restricted ? await isTotpEnrolled(pending.clientId) : await isTwoFactorEnabled(pending.clientId);
  const result = needCode ? await checkLoginCode(pending.clientId, code) : "ok";
  if (result !== "ok") {
    const u = new URL("/saabai-admin/login/verify", req.url);
    u.searchParams.set("error", result);
    return Response.redirect(u.toString(), 303);
  }

  await recordLogin(pending.clientId);
  const headers = new Headers({ Location: new URL(safeRedirect(pending.redirect, "/saabai-admin"), req.url).toString() });
  headers.append("Set-Cookie", sessionCookieHeader(await createSessionToken(pending.clientId)));
  headers.append("Set-Cookie", clearPendingCookieHeader());
  if (trust) headers.append("Set-Cookie", trustCookieHeader(createTrustToken(pending.clientId)));
  return new Response(null, { status: 303, headers });
}
