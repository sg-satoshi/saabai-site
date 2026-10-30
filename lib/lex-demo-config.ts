/**
 * Lex demo firm: fixed identity, label and the read-mostly route allowlist.
 * Edge-safe (used by proxy.ts): no Redis, no Node-only imports.
 *
 * Everything here is fictional. The demo is OFF unless both LEX_DEMO_EMAIL and LEX_DEMO_PASSWORD are set.
 * The demo is never a lex:firm:lf_* record, never a directory user and never in Stripe, so billing, the
 * lex-grace cron and customer counts can't see it. lib/lex-subscription.ts also skips it explicitly.
 */

/** Session clientId for the demo login. Not an admin id, not a directory id. */
export const LEX_DEMO_CLIENT_ID = "lex-demo";
/** Internal identity for the demo user. .example is reserved (RFC 2606), so mail to it can never be delivered. */
export const LEX_DEMO_ACTOR_EMAIL = "demo@harbourvale.example";
/** Firm key (email domain) the demo matters live under. */
export const LEX_DEMO_FIRM_KEY = "harbourvale.example";
export const LEX_DEMO_FIRM_NAME = "Harbour & Vale Lawyers";
export const LEX_DEMO_USER_NAME = "Alex Demo";
export const LEX_DEMO_LABEL = "Demo, fictional data";

export function lexDemoEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.LEX_DEMO_EMAIL?.trim() && env.LEX_DEMO_PASSWORD?.trim());
}
export const isLexDemoClientId = (id: string | null | undefined) => id === LEX_DEMO_CLIENT_ID;

/** True for the demo identity, its firm key, or anything at the reserved demo domain. */
export function isLexDemoIdentity(v: string | null | undefined): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return !!s && (s === LEX_DEMO_FIRM_KEY || s === LEX_DEMO_CLIENT_ID || s.endsWith("@" + LEX_DEMO_FIRM_KEY) || s.startsWith("lf_demo"));
}

/** Lex APIs the demo may call. GET is read-only; the listed writes are wiped by the nightly reset. */
const DEMO_GET = [/^\/api\/lex-me$/, /^\/api\/lex-threads$/, /^\/api\/lex-matters(\/.*)?$/, /^\/api\/portal\/me$/, /^\/api\/lex\/team$/];
const DEMO_WRITE: { method: string; re: RegExp }[] = [
  { method: "POST", re: /^\/api\/lex-research$/ },
  { method: "POST", re: /^\/api\/lex-draft$/ },
  { method: "POST", re: /^\/api\/lex-extract$/ },
  { method: "POST", re: /^\/api\/lex-doc-extract$/ },
  { method: "POST", re: /^\/api\/lex-review$/ },
  { method: "POST", re: /^\/api\/lex-compare$/ },
  { method: "PUT", re: /^\/api\/lex-threads$/ },
  { method: "POST", re: /^\/api\/lex-matters$/ },
  { method: "PATCH", re: /^\/api\/lex-matters\/[^/]+$/ },
  { method: "POST", re: /^\/api\/lex-matters\/[^/]+\/items$/ },
  { method: "POST", re: /^\/api\/auth\/logout$/ },
];
/** Pages the demo may open. /lex/billing and every non-Lex area are refused. */
const DEMO_PAGES = [/^\/lex\/?$/, /^\/login(\/.*)?$/, /^\/legal\/?$/];

/**
 * Hard allowlist for a demo session. Everything not listed is refused: billing, Stripe, team invites,
 * email sends (lex-send, review submit, flag), settings, uploads, deletes, admin and the client portal.
 */
export function lexDemoAllowed(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  if (pathname.startsWith("/_next/") || /\.\w+$/.test(pathname)) return true;
  if (pathname.startsWith("/api/")) {
    if (m === "GET" || m === "HEAD") return DEMO_GET.some((re) => re.test(pathname));
    return DEMO_WRITE.some((w) => w.method === m && w.re.test(pathname));
  }
  return m === "GET" || m === "HEAD" ? DEMO_PAGES.some((re) => re.test(pathname)) : false;
}

export const LEX_DEMO_BLOCKED_MESSAGE = "This is the Lex demo with fictional data. That action is turned off in the demo.";
