import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const config = {
  matcher: ["/((?!_next/|_static/|_vercel|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Pass through saabai.ai, vercel previews, and localhost
  if (
    hostname === "saabai.ai" ||
    hostname.endsWith(".saabai.ai") ||
    hostname.endsWith(".vercel.app") ||
    hostname === "localhost" ||
    hostname.startsWith("127.")
  ) {
    return NextResponse.next();
  }

  // Strip www for lookup — domains are stored without www prefix
  const lookupHost = hostname.startsWith("www.") ? hostname.slice(4) : hostname;

  const slug = await redis.hget<string>("saabai:domain-map", lookupHost);
  if (!slug) return NextResponse.next();

  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  url.pathname = pathname === "/" || pathname === "" ? `/sites/${slug}` : `/sites/${slug}${pathname}`;

  return NextResponse.rewrite(url);
}
