import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateWholesale,
  createWholesaleSessionToken,
  getWholesaleSession,
  wholesaleSessionCookie,
  clearWholesaleSessionCookie,
  WH_COOKIE,
} from "../../../lib/wholesale-auth";
import { getWholesaleAdmin } from "../../../lib/wholesale-admin-auth";

import { loginBlocked, recordLoginFailure, clearLoginFailures, clientIp, tooManyResponse } from "../../../lib/login-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wholesale Homes client sign-in. Checks the per-user accounts approve-lead
 * creates, then the shared WHOLESALE_CLIENT_EMAIL / _PASS fallback, and sets
 * a signed HttpOnly session cookie on success.
 */
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const ip = clientIp(req);
  const wait = await loginBlocked("wh", email, ip);
  if (wait) return tooManyResponse(wait);

  const auth = await authenticateWholesale(email, password);
  if (!auth) {
    await recordLoginFailure("wh", email, ip);
    return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
  }

  await clearLoginFailures("wh", email, ip);
  const res = NextResponse.json({ success: true, name: auth.session.name });
  res.headers.append("Set-Cookie", wholesaleSessionCookie(createWholesaleSessionToken(auth)));
  return res;
}

/** Who is signed in (used by the portal UI). Admins get a preview identity. */
export async function GET(req: NextRequest) {
  const session = await getWholesaleSession(req.cookies.get(WH_COOKIE)?.value);
  if (session) return NextResponse.json({ authenticated: true, email: session.email, name: session.name, preview: false });
  const admin = await getWholesaleAdmin(req.cookies);
  if (admin) return NextResponse.json({ authenticated: true, email: admin.email, name: "Admin preview", preview: true });
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", clearWholesaleSessionCookie());
  return res;
}
