/**
 * Passwordless ("magic link") sign-in for Saabai CLIENT accounts.
 *
 * - Only emails already in the client user list (Redis directory users with
 *   role "user", or env-var clients) can receive a link. Admin accounts are
 *   excluded on purpose: admins keep using their password.
 * - Tokens are 256-bit crypto-random, single-use (atomic GETDEL) and expire
 *   after 15 minutes. Only a SHA-256 hash of the token is stored in Redis.
 * - The post-login redirect is validated to a same-origin relative path.
 * - Callers must respond identically whether or not the email exists.
 */
import { createHash, randomBytes } from "crypto";
import { EMAIL_BRAND, sendBrandedEmail } from "./email/branded-layout";
import { portalMagicLinkEmail } from "./email/templates";
import { getRedis } from "./redis";
import { getDirectoryUser } from "./user-directory";
import { listSites } from "./site-registry";
import { classifySubscription } from "./subscription-classify";
import Stripe from "stripe";
import { loadClients } from "./clients";
import { safeRedirect } from "./safe-redirect";
import { generateEmailCode, storeEmailCode, underCodeRateLimit } from "./portal-email-code";

export const MAGIC_LINK_TTL_SECONDS = 15 * 60;
const MAX_LINKS_PER_WINDOW = 5;

const TOKEN_PREFIX = "client:magic:token:";
const RATE_PREFIX = "client:magic:rate:";

export interface MagicLinkRecord {
  clientId: string;
  email: string;
  redirect: string;
}

export interface EligibleClient {
  clientId: string;
  name: string;
  email: string;
}

export function generateMagicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function baseUrl(): string {
  // Never derive the link host from the request (Host-header injection).
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai").replace(/\/+$/, "");
}

/** Look up a client account that may use magic-link sign-in. Admins excluded. */
export async function findEligibleClient(rawEmail: string): Promise<EligibleClient | null> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) return null;
  const adminId = process.env.SAABAI_ADMIN_ID ?? "saabai";

  const dirUser = await getDirectoryUser(email);
  if (dirUser) {
    if (dirUser.role === "admin" || dirUser.id === adminId) return null;
    return { clientId: dirUser.id, name: dirUser.name || "", email };
  }

  const envClient = loadClients().find((c) => c.email.toLowerCase() === email);
  if (envClient && envClient.id !== adminId) {
    return { clientId: envClient.id, name: envClient.name, email };
  }

  // Hosted website / care clients (Site Factory + Stripe care plan)
  try {
    const sites = await listSites();
    const site = sites.find((s) => (s.business?.email || "").toLowerCase() === email);
    if (site) {
      return {
        clientId: site.id,
        name: site.business?.name || site.name,
        email,
      };
    }
  } catch {
    /* ignore */
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });
      const customers = await stripe.customers.list({ email, limit: 5 });
      for (const customer of customers.data) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 10,
        });
        for (const sub of subs.data) {
          if (classifySubscription(sub.metadata || {}) !== "website_care") continue;
          return {
            clientId: sub.metadata?.siteId || `care-${customer.id}`,
            name: customer.name || email,
            email,
          };
        }
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

/** Store a new single-use token for this client. Returns the raw token. */
export async function createMagicLink(client: EligibleClient, redirect: unknown): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const token = generateMagicToken();
  const record: MagicLinkRecord = {
    clientId: client.clientId,
    email: client.email,
    redirect: safeRedirect(redirect, "/client-portal"),
  };
  await redis.set(`${TOKEN_PREFIX}${hashToken(token)}`, JSON.stringify(record), { ex: MAGIC_LINK_TTL_SECONDS });
  return token;
}

/** Atomically consume a token. Returns null if missing, expired or already used. */
export async function consumeMagicLink(token: unknown): Promise<MagicLinkRecord | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.getdel(`${TOKEN_PREFIX}${hashToken(token)}`);
  if (!raw) return null;
  let rec: Partial<MagicLinkRecord> | null = null;
  if (typeof raw === "string") {
    try { rec = JSON.parse(raw); } catch { rec = null; }
  } else {
    rec = raw as Partial<MagicLinkRecord>;
  }
  if (!rec?.clientId || !rec.email) return null;
  return { clientId: rec.clientId, email: rec.email, redirect: safeRedirect(rec.redirect, "/dashboard") };
}

/** Simple per-email throttle: max 5 links per 15 minutes. */
async function underRateLimit(email: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `${RATE_PREFIX}${hashToken(email)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, MAGIC_LINK_TTL_SECONDS);
  return n <= MAX_LINKS_PER_WINDOW;
}

/**
 * Full flow for a sign-in request. Never throws and never reveals whether the
 * email exists; run it after the response is sent so timing is identical too.
 */
export async function processMagicLinkRequest(email: unknown, redirect: unknown): Promise<void> {
  try {
    if (typeof email !== "string") return;
    const client = await findEligibleClient(email);
    if (!client) return;
    if (!(await underRateLimit(client.email))) return;
    const token = await createMagicLink(client, redirect);
    if (!token) return;
    const link = `${baseUrl()}/client-portal/auth?token=${encodeURIComponent(token)}`;
    let code: string | null = null;
    if (await underCodeRateLimit(client.email)) {
      code = generateEmailCode();
      await storeEmailCode(client.email, code, { clientId: client.clientId, redirect: safeRedirect(redirect, "/client-portal") });
    }

    const branded = portalMagicLinkEmail({ name: client.name, link, code });
    const sent = await sendBrandedEmail({
      to: client.email,
      email: branded,
      from: EMAIL_BRAND.fromPortal,
    });
    if (!sent && process.env.NODE_ENV !== "production") {
      console.log("[client-magic-link] (dev) link:", link, "code:", code);
    }
  } catch (err) {
    console.error("[client-magic-link] request failed", err instanceof Error ? err.message : err);
  }
}
