import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "./lib/auth";

/**
 * Saabai Client Portal proxy (Next.js 16+).
 *
 * NOTE: proxyConfig matcher alone is not sufficient — always guard explicitly
 * inside the function so static assets, login, and API routes are never blocked.
 */

const PROTECTED = ["/rex-dashboard", "/rex-analytics", "/rex-changelog"];
const LEGACY_PW = process.env.REX_DASHBOARD_PASSWORD ?? "";

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) return true;
  }
  if (LEGACY_PW) {
    const legacy = req.cookies.get("rex_dash_auth")?.value;
    if (legacy === LEGACY_PW) return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always pass through: static assets, login page, auth routes, everything else
  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  // Check authentication for protected routes only
  const authed = await isAuthenticated(req);
  if (authed) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("redirect", pathname);
  return NextResponse.redirect(login);
}

export const proxyConfig = {
  matcher: [
    "/rex-dashboard/:path*",
    "/rex-analytics/:path*",
    "/rex-changelog/:path*",
  ],
};
