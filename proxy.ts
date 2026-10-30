import { NextRequest, NextResponse } from "next/server";
import { ATTR_COOKIE, ATTR_MAX_AGE, mergeTouch, parseAttr, serialiseAttr, touchFrom } from "./lib/growth/attribution";
import { Redis } from "@upstash/redis";
import { COOKIE_NAME, resolveStaff } from "./lib/auth";
import { ACL_HEADER, ADMIN_AUDIT_KEY, ADMIN_AUDIT_MAX, aclHeaderValue, gate } from "./lib/access";
import { getRequestSession } from "./lib/request-session";
import { CHAT_API, chatGuard } from "./lib/chat-guard";
import { formGuard } from "./lib/form-guard";
import { lmmBrandAsset } from "./lib/lmm-brand";
import { EXP_COOKIE, EXP_HEADER, EXP_MAX_AGE, EXP_OFF_COOKIE, EXP_TRACK_HEADER, assignAll, enabledSites, parseExpCookie, privacySignal, siteKeyForHost } from "./lib/exp/core";
import { getExperiments } from "./lib/exp/config";
import { SLOTS } from "./lib/exp/seed";
import { CHIEF_COOKIE, chiefAllowed, chiefAudit, chiefHostOk, verifyChiefToken } from "./lib/chief";
import { OV_COOKIE, encodeOverlay, liveOverlays, overlayPathOk } from "./lib/exp/overlay";
import {
  NOINDEX_ROBOTS,
  ROBOTS_REQUEST_HEADER,
  STATIC_DOMAIN_MAP,
  canonicalDomainsFromHostMap,
  canonicalHostForSlug,
  clientSiteRequestDecision,
  apexWwwRedirect,
  isAdminSitePreview,
  isSaabaiProductionHost,
  parseSitesPath,
  slugForHost,
} from "./lib/client-site-surface";

// Pages that declare a slot in code. Only these paths pay for an experiment lookup; every other page is untouched.
const SLOT_PATHS = new Set(SLOTS.map((s) => s.path));

const redis = Redis.fromEnv();


// Page routes that require a logged-in session.
const PROTECTED_PAGES = [
  "/saabai-admin",
  "/admin",
  "/edge",
  "/pulse",
  "/mission-control",
  "/atlas-memory-control",
  "/lex",                // Lex research tool (signed-in Lex users only; the public sales page is /legal)
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
  "/api/chief-auth",         // Chief read-only QA login (own env password, rate limited, master host only)
  "/api/auth/logout",
  "/api/auth/login-as/exit", // ends Login as; validates its own signed marker and the admin token inside
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/magic-link",
  "/api/auth/2fa",            // admin 2FA code step (checks its own signed pending cookie)    // client magic-link request + verify (self-validating)
  "/api/portal/login",
  "/api/portal/auth",        // magic-link handler — sets the session cookie
  "/api/portal/verify-code", // 6-digit email code exchange (opaque errors)
  "/api/portal/request-access", // access request + auto-approve (opaque ok)
  "/api/portal/requests", // client change requests (portal_session inside)
  "/api/portal/billing", // plans, add-ons, billing (portal_session inside)
  // Public chat widgets (embedded on client + marketing sites)
  "/api/chat",
  "/api/lex-chat",
  "/api/lmm-chat",
  "/api/nextinvestment-chat",
  "/api/tributum-chat",
  "/api/nico-chat",
  "/api/bo-chat",
  "/api/site-factory-chat",  // generic Site Factory widget (Wholesale Homes etc.)
  "/api/chat-platform/message", // central chatbot platform (origin, limits and on/off inside)
  "/api/chat-platform/config",  // public widget config (read-only, no secrets)
  "/api/chat-platform/event",   // handoff click counter (no lead post, no client notify)
  "/api/legal-demo",            // public /legal demo, fictional firm, no lead capture; origin and limits inside
  "/api/bo-contact",
  "/api/lmm-contact",
  "/api/leadgen/chat",
  // /api/lex-extract and /api/lex-compare are NOT public: they fall through to the session check like the other Lex APIs.
  // Public lead / contact capture
  "/api/lex-leads",
  "/api/advisory-leads",
  "/api/leads",
  "/api/ig/check",        // Instagram instant site check (GET crawl only, rate limited, no lead email)
  "/api/site-factory/lead",
  "/api/leadgen/lead",
  "/api/subscribe",
  "/api/onboarding",
  "/api/wholesale-auth",
  "/api/wholesale-admin-auth", // Wholesale admin sign-in (issues its own signed cookie)
  "/api/wholesale-admin",      // Wholesale admin data; each route checks the Wholesale admin session
  "/api/wholesale-files",      // members-only Wholesale files; the route checks member/admin session
  "/api/cycle-repair/lead",    // Stu's Cycle Repairs contact form
  // Public lead-gen tool (top of funnel)
  "/api/analyze-document",
  // AI Audit fact-find — token-gated public questionnaire (clients have no login)
  "/api/audit/factfind",
  // Blueprint search onboarding. Same fact-find token, no login. The route stores nothing for demo tokens.
  "/api/audit/onboarding",
  // Payments (Stripe verifies its own webhook signatures)
  "/api/checkout",
  "/api/lex/signup",         // Lex Firm plan signup -> Stripe Checkout (validated, honeypot, rate limited in form-guard)
  "/api/lex/trial",          // Lex self-serve free trial: request + /verify (email confirm, honeypot, rate limited in form-guard; no Stripe)
  "/api/blueprint/checkout", // Saabai Blueprint one-off Stripe Checkout (public buyers)
  "/api/blueprint/score",    // AI Readiness Score results email (public quiz)
  "/api/site-scan",          // website scan step of /score: self-gates (404 unless flag on or admin), rate limited.
  "/api/leadgen/checkout",
  "/api/leadgen/webhook",    // Stripe webhook (verifies its own signature)
  "/api/stripe",
  "/api/webhooks",
  // Write-only telemetry beacon fired from public pages
  "/api/analytics",
  "/api/marketing/event", // Meta Conversions API relay (no-ops until env is set)
  "/api/exp/event",          // split-testing beacon (always 204, ignores bots)
  "/api/announcement/active", // public read of the one live announcement (null unless flag on and live)
  // Widget media / embeds
  "/api/tts",
  // Homepage voice demo. Anonymous on purpose: origin check, caps and session secret are enforced inside.
  "/api/voice/session",
  "/api/voice/pulse",
  "/api/voice/transcript",
  "/api/voice/end",
  "/api/leadgen/widget",
  // /api/leadgen/config is NOT public: it lists every client's settings. Session required here; the route checks admin or own-record.
  // Saabai AI Agent public widget + chat (self-authenticated by slug; config
  // injected server-side, no API key or tenant data reaches the browser)
  "/api/ai-agent/widget",
  "/api/ai-agent/chat",
  // Public content
  "/api/news",
  "/api/og",
  // Scheduled jobs (each route checks Authorization: Bearer ${CRON_SECRET}
  "/api/cron",
  "/api/unsubscribe",       // one-click marketing unsubscribe (signed token)
  "/api/testimonial",       // client testimonial form (unguessable token)
  "/api/instagram/cron",
  // MCP gateway — self-authenticated. The route enforces Authorization: Bearer
  // MCP_API_KEY via authorizeRequest(); exempt at the proxy so it can be reached
  // on the master domain (saabai.ai) like any external MCP client.
  "/api/mcp",
];

// Admin-only endpoints (destructive, PII, or operator tooling). Require a
// admin session (isAdminSession: SAABAI_ADMIN_ID or a directory user with role=admin).
const ADMIN_API = [
  "/api/admin",
  "/api/user-directory",
  "/api/site-factory",      // authoring/destructive (lead is public, listed above)
  "/api/site-factory-chat",
  "/api/leadgen/leads",     // client PII
  "/api/leadgen/topup",     // creates Stripe checkouts for any clientId; no client UI calls it
  "/api/saabai-crm",        // Saabai sales CRM: every lead's name, phone, email (was reachable by any client or portal session)
  "/api/edge",              // Shane's personal coach data
  "/api/instagram",         // social posting (cron is public, listed above)
  "/api/linkedin",
  "/api/pulse-generate",
  "/api/agent-tasks",
  "/api/growth",
  "/api/mission-control",
  "/api/lex-settings",
  "/api/lex-review-queue",   // supervisor queue across firms: genuinely admin
  // /api/lex-review and /api/lex-review-submit are NOT admin-only: signed-in Lex firm users run them,
  // and each route checks the caller and the firm's daily cap (lib/lex-review-access).
  "/api/deploy",
  "/api/imagine",
  "/api/subscribers",
  // AI Agent portal (admin/operator — Train ingest, persona config, analytics)
  "/api/ai-agent/ingest",
  "/api/ai-agent/agents",
  "/api/ai-agent/overview",
];

// Public endpoints that client websites on their own domains call today but
// that stay session-protected on saabai.ai (e.g. the site chat widget, which
// is also the Site Factory authoring chat). Only allowed on custom domains.
// Custom domains mapped in code live in lib/client-site-surface.ts (STATIC_DOMAIN_MAP).

const CUSTOM_DOMAIN_PUBLIC_API = [
  "/api/site-factory-chat",
  "/api/chat-platform/message",
  "/api/chat-platform/config",
  "/api/chat-platform/event",
];


function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

async function getSession(req: NextRequest): Promise<{ clientId: string } | null> {
  return getRequestSession(req);
}

async function apiAuth(req: NextRequest, pathname: string): Promise<NextResponse> {
  const res = await apiAuthCheck(req, pathname);
  if (res.status === 200) {
    const limited = await formGuard(req, redis);
    if (limited) return limited;
  }
  if (res.status === 200 && matches(pathname, CHAT_API)) {
    const blocked = await chatGuard(req, redis);
    if (blocked) return blocked;
  }
  return res;
}

/** Append-only admin audit (Redis list, newest first, capped). Actor comes from the signed session, never the body. No bodies, no query strings, no secrets. */
async function adminAudit(entry: Record<string, string | number | boolean | undefined>): Promise<void> {
  try {
    await redis.lpush(ADMIN_AUDIT_KEY, JSON.stringify({ t: new Date().toISOString(), ...entry }));
    await redis.ltrim(ADMIN_AUDIT_KEY, 0, ADMIN_AUDIT_MAX - 1);
  } catch { /* auditing never blocks */ }
}

type Staff = NonNullable<Awaited<ReturnType<typeof resolveStaff>>>;

/**
 * Central enforcement for signed-in staff on admin pages and ADMIN_API. Full admins pass unchanged (writes are audited).
 * Restricted staff (viewer / per-area) are decided by lib/access.ts: deny by default, 2FA enrolment required first.
 * Returns a response to short-circuit, or null to continue.
 */
async function staffGate(req: NextRequest, pathname: string, staff: Staff | null, kind: "api" | "page"): Promise<NextResponse | null> {
  if (!staff) return null;
  const method = req.method.toUpperCase();
  const write = method !== "GET" && method !== "HEAD";
  const full = staff.grant.role === "admin";
  const enrolled = full ? true : !!(await redis.get(`admin2fa:${staff.id}`).catch(() => null));
  const g = gate(staff.grant, method, pathname, enrolled);
  const base = { actor: staff.id, email: staff.email, role: staff.grant.role, m: method, p: pathname.slice(0, 160), area: g.decision.area };
  if (g.action === "allow") {
    if (write) await adminAudit({ ...base, result: "allow" });
    if (full) return null;
    const headers = new Headers(req.headers);
    headers.set(ACL_HEADER, await aclHeaderValue(staff.id));
    return NextResponse.next({ request: { headers } });
  }
  if (kind === "api" || write) await adminAudit({ ...base, result: g.action === "enrol" ? "enrol-required" : `deny:${g.decision.reason}` });
  if (g.action === "enrol") {
    if (kind === "page") return NextResponse.redirect(new URL("/saabai-admin/security?enrol=required", req.url));
    return NextResponse.json({ error: "Two-factor enrolment required" }, { status: 403 });
  }
  if (kind === "page") return NextResponse.redirect(new URL("/saabai-admin?denied=1", req.url));
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function apiAuthCheck(req: NextRequest, pathname: string): Promise<NextResponse> {
  if (matches(pathname, PUBLIC_API)) return NextResponse.next();

  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (matches(pathname, ADMIN_API)) {
    const staff = await resolveStaff(session.clientId);
    if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return (await staffGate(req, pathname, staff, "api")) ?? NextResponse.next();
  }
  return NextResponse.next();
}

export async function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Apex saabai.ai → https://www.saabai.ai (same path and query). Exact host only:
  // www, client domains, and *.vercel.app do not match, so this cannot loop.
  // /api and /api/* are not redirected (MCP and webhooks on the apex).
  const apex = apexWwwRedirect(hostname, req.nextUrl.pathname, req.nextUrl.search);
  if (apex) return NextResponse.redirect(apex.location, apex.status);

  // Custom domain routing — rewrite to /sites/${slug}
  if (
    hostname !== "saabai.ai" &&
    !hostname.endsWith(".saabai.ai") &&
    !hostname.endsWith(".vercel.app") &&
    hostname !== "localhost" &&
    !hostname.startsWith("127.")
  ) {
    const lookupHost = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    // Coded sites and STATIC_DOMAIN_MAP resolve without Redis. Redis still covers factory sites.
    const slug =
      slugForHost(hostname) ??
      (await redis.hget<string>("saabai:domain-map", lookupHost));
    if (slug) {
      const url = req.nextUrl.clone();
      const pathname = url.pathname;
      // Rewrite _next/static assets to the real deployment domain so
      // CSS, JS, and fonts load properly (the custom domain isn't a
      // registered Vercel domain, so Vercel 404s on static chunks there).
      // LMM brand assets: icon/manifest/social-image paths on the LMM host must
      // always resolve to LMM files, never Saabai's. Checked before the generic
      // custom-domain favicon below.
      if (slug === "lmm-site") {
        const lmmAsset = lmmBrandAsset(pathname);
        if (lmmAsset) {
          url.hostname = "www.saabai.ai";
          url.pathname = `/clients/lmm-site/assets/${lmmAsset}`;
          url.search = "";
          return NextResponse.rewrite(url);
        }
      }
      // Shared Saabai brand images (e.g. /brand/agent-avatar.png) live at the
      // root of the master domain; never rewrite them under the site slug.
      if (pathname.startsWith("/brand/")) {
        url.hostname = "www.saabai.ai";
        return NextResponse.rewrite(url);
      }
      // LMM static SEO files (robots, sitemap, llms) live beside its static page.
      if (slug === "lmm-site" && /^\/(robots\.txt|sitemap\.xml|llms\.txt|llms-full\.txt)$/.test(pathname)) {
        url.hostname = "www.saabai.ai";
        url.pathname = `/clients/lmm-site${pathname}`;
        url.search = "";
        return NextResponse.rewrite(url);
      }
      // Custom-domain favicon: the site's own Site Factory favicon, else Saabai's.
      if (pathname === "/favicon.ico") {
        url.hostname = "www.saabai.ai";
        url.pathname = `/sites/${slug}/favicon.ico`;
        return NextResponse.rewrite(url);
      }
      if (pathname.startsWith("/_next/")) {
        url.hostname = "www.saabai.ai";
        return NextResponse.rewrite(url);
      }
      const siteBase = `/sites/${slug}`;
      // API calls are NOT a free pass on custom domains: they get the same
      // deny-by-default checks as on saabai.ai (below), plus a short list of
      // site-facing public endpoints.
      if (pathname.startsWith("/api/")) {
        if (matches(pathname, CUSTOM_DOMAIN_PUBLIC_API)) {
          // Public here, but still size- and rate-limited like every other chat endpoint.
          if (matches(pathname, CHAT_API)) {
            const blocked = await chatGuard(req, redis);
            if (blocked) return blocked;
          }
          return NextResponse.next();
        }
        return apiAuth(req, pathname);
      }
      // Admin and auth pages should pass through without the site slug prefix
      if (pathname.startsWith("/saabai-admin") || pathname.startsWith("/admin") || pathname.startsWith("/login")) {
        return NextResponse.next();
      }
      // Static assets under /sites/{slug}/* (images, fonts, etc.) — rewrite to saabai.ai.
      // Page routes under /sites/{slug}/* (packages, how-it-works, etc.) pass through
      // to the App Router. We distinguish by file extension.
      // Legacy static sites reference assets under /clients/{slug}/.
      if (pathname.startsWith(`/clients/${slug}/`)) {
        url.hostname = "www.saabai.ai";
        return NextResponse.rewrite(url);
      }
      if (pathname.startsWith(siteBase)) {
        const isStatic = /\.\w+$/.test(pathname);
        if (isStatic) {
          url.hostname = "www.saabai.ai";
          return NextResponse.rewrite(url);
        }
        return NextResponse.next();
      }
      url.pathname = pathname === "/" || pathname === "" ? siteBase : `${siteBase}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  const { pathname } = req.nextUrl;

  // Client sites on saabai.ai: 301 to the custom domain, or noindex when there is none.
  // Preview hosts are noindex and are not redirected. Runs after the custom-domain
  // rewrite above, so a request that is already on the client host cannot loop.
  const sitesPath = parseSitesPath(pathname);
  if (sitesPath) {
    let extraDomains = canonicalDomainsFromHostMap(STATIC_DOMAIN_MAP);
    if (isSaabaiProductionHost(hostname) && !canonicalHostForSlug(sitesPath.slug, undefined, extraDomains)) {
      try {
        const map = await redis.hgetall<Record<string, string>>("saabai:domain-map");
        extraDomains = { ...extraDomains, ...canonicalDomainsFromHostMap(map) };
      } catch { /* code registry only */ }
    }
    const decision = clientSiteRequestDecision({
      host: hostname,
      pathname,
      search: req.nextUrl.search,
      extraDomains,
      adminPreview: isAdminSitePreview({
        hasSessionCookie: !!req.cookies.get(COOKIE_NAME)?.value,
        referer: req.headers.get("referer"),
      }),
    });
    if (decision.action === "redirect") return NextResponse.redirect(decision.location, decision.status);
    if (decision.action === "noindex") {
      const headers = new Headers(req.headers);
      headers.set(ROBOTS_REQUEST_HEADER, NOINDEX_ROBOTS);
      const res = NextResponse.next({ request: { headers } });
      res.headers.set("X-Robots-Tag", NOINDEX_ROBOTS);
      return res;
    }
  }

  // ── Chief (AI overseer) read-only session: hard allowlist, everything else refused ──
  const chiefCookie = req.cookies.get(CHIEF_COOKIE)?.value;
  if (chiefCookie && !req.cookies.get(COOKIE_NAME)?.value && chiefHostOk(hostname) && (await verifyChiefToken(chiefCookie))) {
    const ok = chiefAllowed(req.method, pathname);
    const isAsset = pathname.startsWith("/_next/") || /\.\w+$/.test(pathname);
    if (!isAsset && (pathname.startsWith("/saabai-admin") || pathname.startsWith("/api/") || matches(pathname, PROTECTED_PAGES))) {
      await chiefAudit(redis, ok ? "allow" : "deny", { m: req.method, p: pathname.slice(0, 120) });
      if (!ok) {
        return pathname.startsWith("/api/")
          ? NextResponse.json({ error: "Forbidden (chief is read-only)" }, { status: 403 })
          : new NextResponse("Forbidden (chief is read-only)", { status: 403 });
      }
      return NextResponse.next();
    }
  }

  // ── API routes: deny-by-default ──────────────────────────────────────
  if (pathname.startsWith("/api/")) return apiAuth(req, pathname);

  // ── Split testing (saabai.ai only; custom client domains returned above) ──
  const exp = await experimentsRoute(req, pathname, hostname);
  if (exp) return withAttribution(req, exp);

  // ── Page routes: redirect to login when protected ────────────────────
  return withAttribution(req, await pageRoute(req, pathname));
}

/**
 * Variant assignment for saabai.ai pages that declare a slot (see SLOT_PATHS). Fails open: any error serves the page untouched
 * (the page then renders the default copy). Bots, GPC/DNT, admins and opt-outs get the default and no cookie.
 */
async function experimentsRoute(req: NextRequest, pathname: string, hostname: string): Promise<NextResponse | null> {
  try {
    if (req.method !== "GET") return null;
    const key = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    if (matches(pathname, PROTECTED_PAGES)) return null;
    // Code-declared slots always pay for a lookup. Other public pages only do when a runtime-overlay test targets them.
    const maybeOverlay = !SLOT_PATHS.has(key) && overlayPathOk(key);
    if (!SLOT_PATHS.has(key) && !maybeOverlay) return null;
    const siteKey = siteKeyForHost(hostname);
    if (!siteKey || !enabledSites().includes(siteKey)) return null;
    const headers = new Headers(req.headers);
    headers.delete(EXP_HEADER);
    headers.delete(EXP_TRACK_HEADER);
    const optParam = req.nextUrl.searchParams.get("exp_off");
    const optedOut = optParam === "1" || req.cookies.get(EXP_OFF_COOKIE)?.value === "1";
    const forPage = (await getExperiments(siteKey)).filter((e) => e.path === key);
    const exps = forPage.filter((e) => e.status === "running");
    const nativeIds = new Set(SLOTS.map((s) => s.id));
    const wonOv = liveOverlays(forPage.filter((e) => e.status === "won"), nativeIds, key);
    if (maybeOverlay && !exps.length && !wonOv.length) return null;
    const cookie = parseExpCookie(req.cookies.get(EXP_COOKIE)?.value);
    let setCookie: string | undefined;
    let tracked = false;
    if (exps.length) {
      const r = assignAll(exps, {
        ua: req.headers.get("user-agent"),
        privacy: privacySignal(req.headers),
        admin: !!req.cookies.get(COOKIE_NAME)?.value,
        optedOut,
        cookie,
        newVisitorId: () => crypto.randomUUID(),
      });
      headers.set(EXP_HEADER, r.header);
      if (r.track) { headers.set(EXP_TRACK_HEADER, "1"); tracked = true; }
      setCookie = r.cookie;
    }
    const res = NextResponse.next({ request: { headers } });
    // Runtime overlay: only for counted humans (bots, GPC/DNT, admins and opt-outs always get the untouched control HTML).
    const ovExps = liveOverlays(exps, nativeIds, key);
    const assigned = (parseExpCookie(setCookie ?? req.cookies.get(EXP_COOKIE)?.value)?.a) ?? {};
    // A finished test keeps showing its winner to everyone (the overlay stands in until the wrap PR is merged).
    const ovCookie = encodeOverlay(key, [...(tracked ? ovExps : []), ...wonOv], assigned);
    if (ovCookie) res.cookies.set(OV_COOKIE, ovCookie, { maxAge: 600, path: "/", sameSite: "lax", secure: req.nextUrl.protocol === "https:", httpOnly: false });
    else if (req.cookies.get(OV_COOKIE)) res.cookies.delete(OV_COOKIE);
    if (setCookie && tracked) {
      res.cookies.set(EXP_COOKIE, setCookie, { maxAge: EXP_MAX_AGE, path: "/", sameSite: "lax", secure: req.nextUrl.protocol === "https:", httpOnly: true });
    }
    if (optParam === "1") res.cookies.set(EXP_OFF_COOKIE, "1", { maxAge: 365 * 24 * 3600, path: "/", sameSite: "lax", secure: req.nextUrl.protocol === "https:", httpOnly: true });
    if (optParam === "0") res.cookies.delete(EXP_OFF_COOKIE);
    return res;
  } catch {
    return null;
  }
}

/** Sets the first-party sb_attr cookie (first + last touch) on public page views. */
function withAttribution(req: NextRequest, res: NextResponse): NextResponse {
  try {
    const { pathname } = req.nextUrl;
    if (req.method !== "GET" || /\.\w+$/.test(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/sites/") || matches(pathname, PROTECTED_PAGES)) return res;
    const ref = pathname.match(/^\/r\/([A-Za-z0-9_-]{3,32})$/)?.[1] ?? (req.nextUrl.searchParams.get("ref")?.match(/^[A-Za-z0-9_-]{3,32}$/)?.[0]);
    const cur = parseAttr(req.cookies.get(ATTR_COOKIE)?.value);
    const next = mergeTouch(cur, touchFrom(req.nextUrl, req.headers.get("referer"), req.nextUrl.hostname, ref), pathname);
    if (next) res.cookies.set(ATTR_COOKIE, serialiseAttr(next), { maxAge: ATTR_MAX_AGE, path: "/", sameSite: "lax", secure: req.nextUrl.protocol === "https:", httpOnly: true });
  } catch { /* never block a page view on attribution */ }
  return res;
}

async function pageRoute(req: NextRequest, pathname: string): Promise<NextResponse> {
  // The admin login page itself must stay reachable while signed out.
  if (pathname === "/saabai-admin/login" || pathname === "/saabai-admin/login/verify") return NextResponse.next();
  if (!matches(pathname, PROTECTED_PAGES)) return NextResponse.next();
  // /lex/signup (paid checkout page) is reachable only by:
  //  - the Stripe return page (/lex/signup/done), which new firms reach before they have a login;
  //  - the public 60-day free trial start page (/lex/signup/trial, PR 423), open to any firm, with or without ?code=;
  //  - signed-in users (trial firms converting, lapsed firm admins restarting a plan).
  // Everyone else gets a 307 to the public Lex page. The paid checkout API is gated separately in its route.
  if (matches(pathname, ["/lex/signup"])) {
    if (pathname === "/lex/signup/done" || pathname === "/lex/signup/done/") return NextResponse.next();
    if (pathname === "/lex/signup/trial" || pathname === "/lex/signup/trial/") return NextResponse.next();
    if (await getSession(req)) return NextResponse.next();
    return NextResponse.redirect(new URL("/legal", req.url), 307);
  }

  const session = await getSession(req);
  if (session) {
    // Staff on admin pages go through the central access gate (full admins pass; restricted roles are deny-by-default).
    if (matches(pathname, ["/saabai-admin", "/admin", "/mission-control", "/atlas-memory-control", "/edge", "/pulse"])) {
      const staff = await resolveStaff(session.clientId);
      const r = await staffGate(req, pathname, staff, "page");
      if (r) return r;
    }
    return NextResponse.next();
  }

  // Signed-out visitors (and crawlers) to bare /lex get the public Lex page, not a login wall.
  // Deep links (/lex?q=..., /lex/billing) still go to sign-in so firm users land back where they were.
  if (pathname === "/lex" && !req.nextUrl.search) return NextResponse.redirect(new URL("/legal", req.url), 307);

  // Admin areas use the separate admin sign-in; everything else uses /login.
  const isAdminArea = matches(pathname, ["/saabai-admin", "/admin", "/mission-control", "/atlas-memory-control", "/edge", "/pulse"]);
  const login = new URL(isAdminArea ? "/saabai-admin/login" : "/login", req.url);
  // Keep the query string so e.g. /lex?q=... lands back in the same place after sign-in (login runs it through safeRedirect).
  login.searchParams.set("redirect", pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const proxyConfig = {
  matcher: ["/((?!_static/|_vercel).*)"],
};
