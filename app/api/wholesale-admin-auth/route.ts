import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateWholesaleAdmin,
  wholesaleAdminConfigured,
  getWholesaleAdmin,
  wholesaleAdminCookie,
  clearWholesaleAdminCookie,
} from "../../../lib/wholesale-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wholesale Homes admin sign-in. Checks WHOLESALE_ADMIN_EMAIL / _PASS and, on
 * success, sets a signed HttpOnly session cookie that the admin pages and
 * /api/wholesale-admin/* check on the server.
 */
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));

  if (!wholesaleAdminConfigured()) {
    return NextResponse.json({ success: false, error: "Admin auth not configured" }, { status: 500 });
  }

  const token = await authenticateWholesaleAdmin(email, password);
  if (!token) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", wholesaleAdminCookie(token));
  return res;
}

/** Is a Wholesale admin (or a Saabai admin) signed in? */
export async function GET(req: NextRequest) {
  const admin = await getWholesaleAdmin(req.cookies);
  if (!admin) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, email: admin.email, source: admin.source });
}

/** Sign out of the Wholesale admin. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", clearWholesaleAdminCookie());
  return res;
}
