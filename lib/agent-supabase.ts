/**
 * Saabai AI Agent — Supabase tenant-isolation bridge (decision B).
 *
 * We keep our OWN session-token login (lib/auth.ts) and mint a short-lived,
 * Supabase-trusted HS256 JWT that carries a `tenant_id` claim. That token is
 * presented to PostgREST so every query is Row-Level-Security-filtered to the
 * tenant (RLS reads auth.jwt() ->> 'tenant_id'). You never need the Supabase
 * Auth flow, and no shared secret is exposed to any client.
 *
 * Reads  : tenantClient(tenantId) — anon key + minted JWT → RLS scopes it.
 * Writes : serviceClient()        — service_role key → bypasses RLS. For trusted
 *          server-side seed/ingest/index ONLY. NEVER exposed to a browser/client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.SUPABASE_JWT_SECRET;
// Optional: the key ID of our HS256 signing key. If set, it's put in the JWT
// header `kid` so Supabase picks the right key when multiple keys are registered.
const jwtKid = process.env.SUPABASE_JWT_KID;

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

/**
 * Mint a short-lived HS256 JWT signed with the Supabase JWT secret, carrying
 * role='authenticated' + tenant_id. PostgREST verifies it and RLS scopes the row
 * set to that tenant_id (auth.jwt() ->> 'tenant_id').
 */
export function mintTenantJwt(tenantId: string, ttlSeconds = 3600): string {
  if (!jwtSecret) throw new Error("SUPABASE_JWT_SECRET is not set");
  const now = Math.floor(Date.now() / 1000);
  const header: Record<string, unknown> = { alg: "HS256", typ: "JWT" };
  if (jwtKid) header.kid = jwtKid;
  const payload = { role: "authenticated", tenant_id: tenantId, iat: now, exp: now + ttlSeconds };
  const h = b64urlJson(header);
  const p = b64urlJson(payload);
  const sig = createHmac("sha256", jwtSecret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

/** A client scoped to ONE tenant — RLS limits every query to that tenant_id. */
export function tenantClient(tenantId: string): SupabaseClient {
  if (!url || !anonKey) throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY not set");
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => mintTenantJwt(tenantId),
  });
}

/**
 * Admin/service client — bypasses RLS. For trusted server writes only
 * (seeding a tenant, writing knowledge chunks during ingest, industry-KB index).
 * This key is a full backdoor: never expose it to a browser, a widget, or any
 * client-facing route without a trusted auth gate.
 */
export function serviceClient(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
