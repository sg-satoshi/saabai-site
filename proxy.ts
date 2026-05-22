import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { verifySessionToken, COOKIE_NAME } from "./lib/auth";
import { verifySession } from "./lib/portal-session";

const redis = Redis.fromEnv();

const PROTECTED = ["/rex-dashboard", "/rex-analytics", "/rex-changelog", "/saabai-admin"];

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) return true;
  }
  const legacy = req.cookies.get("rex_dash_auth")?.value;
  if (legacy) {
    const session = verifySession(legacy);
    if (session?.email === "rex-dashboard") return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Custom domain routing — rewrite to /sites/${slug}
  if (
    hostname !== "saabai.ai" &&
    !hostname.endsWith(".saabai.ai") &&
    !hostname.endsWith(".vercel.app") &&
    hostname !== "localhost" &&
    !hostname.startsWith("127.")
  ) {
    const lookupHost = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    const slug = await redis.hget<string>("saabai:domain-map", lookupHost);
    if (slug) {
      const url = req.nextUrl.clone();
      const pathname = url.pathname;
      url.pathname = pathname === "/" || pathname === "" ? `/sites/${slug}` : `/sites/${slug}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Auth protection for admin/dashboard routes
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const authed = await isAuthenticated(req);
  if (authed) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("redirect", pathname);
  return NextResponse.redirect(login);
}

export const proxyConfig = {
  matcher: ["/((?!_next/|_static/|_vercel|favicon.ico).*)"],
};
