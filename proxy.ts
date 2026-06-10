import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { verifySessionToken, COOKIE_NAME } from "./lib/auth";
import { verifySession } from "./lib/portal-session";

const redis = Redis.fromEnv();

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

// Page routes that require a logged-in session.
const PROTECTED_PAGES = [
  "/rex-dashboard",
  "/rex-analytics",
  "/rex-changelog",
  "/saabai-admin",
  "/admin",
  "/edge",
  "/pulse",
  "/mission-control",
  "/atlas-memory-control",
];

// ── API authorization tiers ──────────────────────────────────────────────
// Default for /api is DENY: a valid session is required. Two explicit lists
// carve out exceptions. Order matters: PUBLIC is checked before ADMIN, so a
// public sub-route (e.g. /api/site-factory/lead) is allowed even though its
// parent group (/api/site-factory) is admin-gated.

// Anonymous, unauthenticated endpoints: embedded widgets, public lead/contact
// forms, payment flows, auth, content, and cron (cron self-checks CRON_SECRET).
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/portal/login",
  "/api/portal/auth",        // magic-link handler — sets the session cookie
  "/api/rex-dashboard-auth", // dashboard password login — issues the cookie
  // Public chat widgets (embedded on client + marketing sites)
  "/api/chat",
  "/api/pete-chat",
  "/api/lex-chat",
  "/api/lmm-chat",
  "/api/nextinvestment-chat",
  "/api/tributum-chat",
  "/api/leadgen/chat",
  // Public Lex tools on the /lex page (no session check in handlers today)
  "/api/lex-extract",
  "/api/lex-send",
  "/api/lex-compare",
  // Public lead / contact capture
  "/api/rex-leads",
  "/api/lex-leads",
  "/api/advisory-leads",
  "/api/leads",
  "/api/site-factory/lead",
  "/api/leadgen/lead",
  "/api/subscribe",
  "/api/onboarding",
  // Public lead-gen tool (top of funnel)
  "/api/analyze-document",
  // Payments (Stripe verifies its own webhook signatures)
  "/api/checkout",
  "/api/rex-checkout",
  "/api/rex-cart",
  "/api/rex-pay",
  "/api/leadgen/checkout",
  "/api/leadgen/webhook",    // Stripe webhook (verifies its own signature)
  "/api/stripe",
  "/api/webhooks",
  // Write-only telemetry beacon fired from public pages
  "/api/analytics",
  // Widget media / embeds
  "/api/tts",
  "/api/heygen-token",
  "/api/rex-feedback",
  "/api/rex-transcript", // self-checks admin session for reads
  "/api/leadgen/widget",
  "/api/leadgen/config",
  // Public content
  "/api/news",
  "/api/og",
  // Scheduled jobs (each route checks Authorization: Bearer CRON_SECRET)
  "/api/cron",
  "/api/rex-weekly-digest",
  "/api/instagram/cron",
];

// Admin-only endpoints (destructive, PII, or operator tooling). Require a
// session whose clientId matches SAABAI_ADMIN_ID.
const ADMIN_API = [
  "/api/admin",
  "/api/user-directory",
  "/api/site-factory",      // authoring/destructive (lead is public, listed above)
  "/api/site-factory-chat",
  "/api/leadgen/leads",     // client PII
  "/api/edge",              // Shane's personal coach data
  "/api/instagram",         // social posting (cron is public, listed above)
  "/api/linkedin",
  "/api/pulse-generate",
  "/api/agent-tasks",
  "/api/growth",
  "/api/mission-control",
  "/api/lex-settings",
  "/api/lex-review-queue",
  "/api/lex-review-submit",
  "/api/lex-review",
  "/api/rex-woo-backfill",
  "/api/rex-price-test",
  "/api/rex-pipedrive-sync",
  "/api/rex-analytics",
  "/api/deploy",
  "/api/imagine",
  "/api/subscribers",
];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

async function getSession(req: NextRequest): Promise<{ clientId: string } | null> {
  // Primary: Saabai admin/client session (clientId can equal SAABAI_ADMIN_ID).
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) return session;
  }
  // Portal session (law-firm clients via magic link). Never admin — the
  // clientId is namespaced so it can't match SAABAI_ADMIN_ID. Portal/Lex
  // routes still do their own per-user checks on top of this.
  const portal = req.cookies.get("portal_session")?.value;
  if (portal) {
    const s = verifySession(portal);
    if (s?.email) return { clientId: `portal:${s.email}` };
  }
  // Legacy rex-dashboard cookie maps to a non-admin session.
  const legacy = req.cookies.get("rex_dash_auth")?.value;
  if (legacy) {
    const session = verifySession(legacy);
    if (session?.email === "rex-dashboard") return { clientId: "rex-dashboard" };
  }
  return null;
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

  const { pathname } = req.nextUrl;

  // ── API routes: deny-by-default ──────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (matches(pathname, PUBLIC_API)) return NextResponse.next();

    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (matches(pathname, ADMIN_API) && session.clientId !== ADMIN_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ── Page routes: redirect to login when protected ────────────────────
  if (!matches(pathname, PROTECTED_PAGES)) return NextResponse.next();

  const session = await getSession(req);
  if (session) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("redirect", pathname);
  return NextResponse.redirect(login);
}

export const proxyConfig = {
  matcher: ["/((?!_next/|_static/|_vercel|favicon.ico).*)"],
};
