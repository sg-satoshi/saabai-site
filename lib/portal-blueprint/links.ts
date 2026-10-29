/**
 * Magic links for Blueprint buyers. Same engine design as the client magic
 * link (256-bit token, SHA-256 hash stored, single use via GETDEL) but with a
 * separate keyspace and a separate eligibility check: any email with a
 * Blueprint engagement, and nobody else.
 */
import { createHash, randomBytes } from "crypto";
import { getRedis } from "../redis";
import { findEngagementsByEmail } from "../audit-store";
import { safeRedirect } from "../safe-redirect";
import { EMAIL_BRAND, sendBrandedEmail } from "../email/branded-layout";
import { portalAllowed, portalEnabled } from "./flag";
import { portalLinkEmail } from "./emails";

export const LINK_TTL_SECONDS = 15 * 60;
export const FIRST_LINK_TTL_SECONDS = 24 * 60 * 60;
const TOKEN_PREFIX = "bp:magic:";
const RATE_PREFIX = "bp:rate:";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai").replace(/\/+$/, "");
}

/** Vercel preview hosts for this project only (deployment and branch aliases). */
const PREVIEW_HOST_RE = /^saabai-site-[a-z0-9-]+-shanegoldbergs-projects\.vercel\.app$/;

/** Hosts we will put in a portal link. Anything else falls back to baseUrl(). */
export function isAllowedPortalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.trim().toLowerCase();
  return h === "saabai.ai" || h === "www.saabai.ai" || PREVIEW_HOST_RE.test(h);
}

/**
 * Base URL for links and redirects in portal emails. Production always uses
 * baseUrl() (https://www.saabai.ai). On previews it uses the host the request
 * came in on, then the deployment's own Vercel URL, so a preview email points
 * back at that preview. Only allow-listed hosts are trusted.
 */
export function portalBaseUrl(req?: Request | null): string {
  if (process.env.VERCEL_ENV === "production") return baseUrl();
  const candidates: (string | null | undefined)[] = [];
  if (req) {
    candidates.push(req.headers.get("x-forwarded-host")?.split(",")[0], req.headers.get("host"));
  }
  if (process.env.VERCEL_ENV === "preview") candidates.push(process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL);
  for (const c of candidates) {
    if (c && isAllowedPortalHost(c)) return `https://${c.trim().toLowerCase()}`;
  }
  return baseUrl();
}

export async function createPortalToken(
  email: string,
  opts: { redirect?: string; ttlSeconds?: number } = {}
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const token = randomBytes(32).toString("base64url");
  const rec = { email: email.trim().toLowerCase(), redirect: safeRedirect(opts.redirect, "/portal") };
  await redis.set(`${TOKEN_PREFIX}${hash(token)}`, JSON.stringify(rec), { ex: opts.ttlSeconds ?? LINK_TTL_SECONDS });
  return token;
}

export async function consumePortalToken(token: unknown): Promise<{ email: string; redirect: string } | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.getdel(`${TOKEN_PREFIX}${hash(token)}`);
  if (!raw) return null;
  let rec: { email?: string; redirect?: string } | null = null;
  try {
    rec = typeof raw === "string" ? JSON.parse(raw) : (raw as { email?: string; redirect?: string });
  } catch {
    rec = null;
  }
  if (!rec?.email) return null;
  return { email: rec.email, redirect: safeRedirect(rec.redirect, "/portal") };
}

export function linkUrl(token: string, base: string = baseUrl()): string {
  return `${base.replace(/\/+$/, "")}/portal/auth?token=${encodeURIComponent(token)}`;
}

async function underLimit(key: string, max: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const k = `${RATE_PREFIX}${hash(key)}`;
  const n = await redis.incr(k);
  if (n === 1) await redis.expire(k, LINK_TTL_SECONDS);
  return n <= max;
}

export async function underIpLimit(ip: string): Promise<boolean> {
  return underLimit(`ip:${ip || "unknown"}`, 20);
}

/**
 * Email a sign-in link if (and only if) this email has an engagement the portal
 * is enabled for. Never throws, never reveals whether the email exists.
 */
export async function sendPortalLink(rawEmail: unknown, opts: { base?: string } = {}): Promise<void> {
  try {
    if (!portalEnabled() || typeof rawEmail !== "string") return;
    const email = rawEmail.trim().toLowerCase();
    if (!email.includes("@") || email.length > 254) return;
    if (!portalAllowed(email)) return;
    const engagements = await findEngagementsByEmail(email);
    if (engagements.length === 0) return;
    if (!(await underLimit(`email:${email}`, 5))) return;
    const dest = engagements.length === 1 ? `/portal/${engagements[0].id}/factfind` : "/portal";
    const token = await createPortalToken(email, { redirect: dest });
    if (!token) return;
    const link = linkUrl(token, opts.base || portalBaseUrl());
    const mail = portalLinkEmail({ name: engagements[0].contactName, link });
    const sent = await sendBrandedEmail({ to: email, email: mail, from: EMAIL_BRAND.fromPortal });
    if (!sent && process.env.NODE_ENV !== "production") console.log("[blueprint-portal] (dev) link:", link);
  } catch (err) {
    console.error("[blueprint-portal] link request failed", err instanceof Error ? err.message : err);
  }
}
