import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "./lib/auth";

/**
 * Saabai Client Portal proxy (Next.js 16+).
 * Renamed from middleware.ts → proxy.ts per Next.js 16 convention.
 *
 * Protects /rex-dashboard, /rex-analytics, and /rex-changelog.
 * Falls back to the legacy rex_dash_auth cookie for backward compatibility.
 */

const LEGACY_PW = process.env.REX_DASHBOARD_PASSWORD ?? "";

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  // Primary: new Saabai session token
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) return true;
  }

  // Fallback: legacy rex_dash_auth cookie (keeps existing sessions working)
  if (LEGACY_PW) {
    const legacy = req.cookies.get("rex_dash_auth")?.value;
    if (legacy === LEGACY_PW) return true;
  }

  return false;
}

export async function proxy(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (authed) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const proxyConfig = {
  matcher: [
    "/rex-dashboard/:path*",
    "/rex-analytics/:path*",
    "/rex-changelog/:path*",
  ],
};
