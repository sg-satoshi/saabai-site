/**
 * Access model: who may do what, and where. Pure and Edge safe (no I/O), so proxy.ts, route handlers
 * and tests all share one decision function.
 *
 * Scope of release 1: INTERNAL admin accounts (role admin / viewer / custom). The shape is deliberately
 * wider so later releases can add external principals without a migration:
 *   kind      internal | client | contractor | partner | service (API key)   [only "internal" is issued today]
 *   areas     per area none | read | write
 *   scope     optional tenant / site restriction (enforced by area handlers when kind != internal)
 *   expiresAt optional ISO date; after it the grant is dead (contractors, trials, short-lived keys)
 *   disabled / revokedAt  instant kill, checked on every request (no cached trust)
 * See docs/access-model.md for the extension path.
 */

export const AREAS = ["coupons", "products", "chatbots", "experiments", "orders", "customers", "announcements", "billing", "roadmap", "users"] as const;
export type Area = (typeof AREAS)[number];
export type Level = "none" | "read" | "write";
export type AccessRole = "admin" | "viewer" | "custom";
export type PrincipalKind = "internal" | "client" | "contractor" | "partner" | "service";

export interface AccessScope {
  /** Future: restrict to one tenant (client) id. */
  tenantId?: string;
  /** Future: restrict to specific Site Factory site ids. */
  siteIds?: string[];
}

export interface AccessGrant {
  role: AccessRole;
  kind?: PrincipalKind;
  areas?: Partial<Record<Area, Level>>;
  scope?: AccessScope;
  expiresAt?: string;
  disabled?: boolean;
  revokedAt?: string;
}

/** Highest level an area may ever be granted to a non-admin. users: never (admin only). billing: read only. */
export const MAX_LEVEL: Record<Area, Level> = {
  coupons: "write", products: "write", chatbots: "write", experiments: "write", orders: "write",
  customers: "write", announcements: "write", billing: "read", roadmap: "write", users: "none",
};

const RANK: Record<Level, number> = { none: 0, read: 1, write: 2 };
export const minLevel = (a: Level, b: Level): Level => (RANK[a] <= RANK[b] ? a : b);

/** Page and API prefixes per area. ANYTHING NOT LISTED IS ADMIN ONLY (deny by default). */
const AREA_PREFIXES: Record<Area, string[]> = {
  coupons: ["/saabai-admin/marketing/offers", "/api/admin/coupons"],
  products: ["/saabai-admin/products", "/api/admin/products"],
  chatbots: ["/saabai-admin/chatbots", "/saabai-admin/chat-history", "/api/admin/chatbots", "/saabai-admin/site-factory", "/api/site-factory", "/api/ai-agent/agents", "/api/ai-agent/overview", "/api/ai-agent/ingest"],
  experiments: ["/saabai-admin/experiments", "/api/admin/experiments"],
  orders: ["/saabai-admin/orders", "/api/admin/orders"],
  customers: ["/saabai-admin/customers", "/saabai-admin/leadgen-clients", "/api/admin/customers"],
  announcements: ["/saabai-admin/announcements", "/api/admin/announcements"],
  billing: ["/saabai-admin/payments", "/saabai-admin/plans", "/api/admin/billing", "/api/admin/invoices", "/api/admin/invoice-clients", "/api/admin/payments"],
  roadmap: ["/saabai-admin/roadmap", "/api/admin/roadmap"],
  users: ["/saabai-admin/users", "/api/user-directory", "/api/admin/portal-users", "/api/admin/portal-invite", "/api/admin/migrate-user"],
};

/** Reachable by any signed-in staff member (their own landing page and own 2FA). Exact or prefix. */
const SELF_EXACT = ["/saabai-admin"];
const SELF_PREFIX = ["/saabai-admin/security", "/api/admin/2fa"];
/** The only paths open to a restricted account that has not enrolled 2FA yet. */
export const ENROL_PATHS = ["/saabai-admin/security", "/api/admin/2fa"];

const under = (p: string, prefix: string) => p === prefix || p.startsWith(prefix + "/");

export function normalisePath(pathname: string): string {
  let p = pathname.split("?")[0].split("#")[0];
  try { p = decodeURIComponent(p); } catch { /* keep raw */ }
  p = p.replace(/\/{2,}/g, "/").replace(/\\/g, "/");
  // Any dot-segment is suspicious: refuse to guess where it points (maps to no area, so admin only).
  if (p.split("/").some((seg) => seg === "." || seg === "..")) return "/__invalid__";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p.toLowerCase();
}

export function areaForPath(pathname: string): Area | "self" | "admin-only" {
  const p = normalisePath(pathname);
  if (SELF_EXACT.includes(p) || SELF_PREFIX.some((s) => under(p, s))) return "self";
  for (const a of AREAS) if (AREA_PREFIXES[a].some((x) => under(p, x))) return a;
  return "admin-only";
}

export const needFor = (method: string): "read" | "write" => (method === "GET" || method === "HEAD" ? "read" : "write");

export function grantActive(g: AccessGrant | undefined | null, now = Date.now()): boolean {
  if (!g) return true; // legacy record with no access block: unchanged full admin
  if (g.disabled || g.revokedAt) return false;
  if (g.expiresAt) {
    const t = Date.parse(g.expiresAt);
    if (!Number.isFinite(t) || t <= now) return false; // unparsable expiry fails closed
  }
  return true;
}

export function levelFor(g: AccessGrant, area: Area, now = Date.now()): Level {
  if (!grantActive(g, now)) return "none";
  if (g.role === "admin") return "write";
  const raw = g.areas?.[area] ?? "none";
  let lvl = minLevel(raw in RANK ? raw : "none", MAX_LEVEL[area]);
  if (g.role === "viewer") lvl = minLevel(lvl, "read");
  return lvl;
}

export type Decision = { allow: boolean; area: Area | "self" | "admin-only"; need: "read" | "write"; reason: string };

/** THE decision function. Used by proxy.ts for every admin page and ADMIN_API request. */
export function decide(g: AccessGrant | null | undefined, method: string, pathname: string, now = Date.now()): Decision {
  const need = needFor(method.toUpperCase());
  const area = areaForPath(pathname);
  if (!g || !grantActive(g, now)) return { allow: false, area, need, reason: "inactive" };
  if (g.role === "admin") return { allow: true, area, need, reason: "admin" };
  if (area === "self") return { allow: true, area, need, reason: "self" };
  if (area === "admin-only") return { allow: false, area, need, reason: "admin-only" };
  const have = levelFor(g, area, now);
  const ok = RANK[have] >= RANK[need];
  return { allow: ok, area, need, reason: ok ? "granted" : `needs-${need}` };
}

/** Clean, bounded grant from untrusted input (users admin API). Never trusts client-sent derived fields. */
export function sanitizeGrant(input: unknown): AccessGrant | null {
  if (!input || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;
  const role = i.role === "admin" || i.role === "viewer" || i.role === "custom" ? i.role : null;
  if (!role) return null;
  const g: AccessGrant = { role, kind: "internal" };
  if (role !== "admin") {
    const areas: Partial<Record<Area, Level>> = {};
    const src = (i.areas && typeof i.areas === "object" ? i.areas : {}) as Record<string, unknown>;
    for (const a of AREAS) {
      const v = src[a];
      if (v === "read" || v === "write") {
        const capped = minLevel(minLevel(v, MAX_LEVEL[a]), role === "viewer" ? "read" : "write");
        if (capped !== "none") areas[a] = capped;
      }
    }
    g.areas = areas;
  }
  if (typeof i.expiresAt === "string" && i.expiresAt) {
    const t = Date.parse(i.expiresAt);
    if (Number.isFinite(t)) g.expiresAt = new Date(t).toISOString();
  }
  if (i.disabled === true) g.disabled = true;
  if (i.scope && typeof i.scope === "object") {
    const s = i.scope as Record<string, unknown>;
    const scope: AccessScope = {};
    if (typeof s.tenantId === "string" && s.tenantId) scope.tenantId = s.tenantId.slice(0, 100);
    if (Array.isArray(s.siteIds)) scope.siteIds = s.siteIds.filter((x): x is string => typeof x === "string").slice(0, 50).map((x) => x.slice(0, 100));
    if (scope.tenantId || scope.siteIds?.length) g.scope = scope;
  }
  return g;
}

// ── Proxy -> handler bridge ─────────────────────────────────────────────
// Handlers historically call isAdminSession (strict, full admins only). When the proxy has approved a restricted
// principal for THIS request it stamps an HMAC header that only the server can produce; the loosened helpers
// (lib/auth-acl.ts) accept it. Unmigrated handlers ignore it and stay admin-only (fail closed).
export const ACL_HEADER = "x-saabai-acl";

export async function aclHeaderValue(clientId: string): Promise<string> {
  const secret = process.env.SAABAI_SESSION_SECRET;
  if (!secret) throw new Error("SAABAI_SESSION_SECRET is not set");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`acl-v1:${clientId}`)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const ADMIN_AUDIT_KEY = "saabai:admin-audit";
export const ADMIN_AUDIT_MAX = 2000;

export type GateResult = { action: "allow" | "deny" | "enrol"; decision: Decision };

/**
 * Full gate for one request: access decision plus the 2FA rule. A restricted account without TOTP enrolled
 * may only reach the enrol paths; everything else answers "enrol". Full admins keep their existing flow.
 */
export function gate(g: AccessGrant | null | undefined, method: string, pathname: string, totpEnrolled: boolean, now = Date.now()): GateResult {
  const decision = decide(g, method, pathname, now);
  if (!g || !decision.allow) return { action: "deny", decision };
  if (g.role !== "admin" && !totpEnrolled) {
    const p = normalisePath(pathname);
    return ENROL_PATHS.some((e) => under(p, e)) ? { action: "allow", decision } : { action: "enrol", decision };
  }
  return { action: "allow", decision };
}
