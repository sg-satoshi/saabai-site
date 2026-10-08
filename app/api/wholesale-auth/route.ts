import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateWholesale,
  createWholesaleSessionToken,
  getWholesaleSession,
  wholesaleSessionCookie,
  clearWholesaleSessionCookie,
  WH_COOKIE,
} from "../../../lib/wholesale-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wholesale Homes client sign-in. Checks the per-user accounts approve-lead
 * creates, then the shared WHOLESALE_CLIENT_EMAIL / _PASS fallback, and sets
 * a signed HttpOnly session cookie on success.
 */
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));

  const auth = await authenticateWholesale(email, password);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true, name: auth.session.name });
  res.headers.append("Set-Cookie", wholesaleSessionCookie(createWholesaleSessionToken(auth)));
  return res;
}

/** Who is signed in (used by the portal UI). */
export async function GET(req: NextRequest) {
  const session = await getWholesaleSession(req.cookies.get(WH_COOKIE)?.value);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, email: session.email, name: session.name });
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", clearWholesaleSessionCookie());
  return res;
}
