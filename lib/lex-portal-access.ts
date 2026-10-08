/**
 * Who may receive a Lex client-portal ("/client-portal") magic link.
 *
 * A "known portal client" is any of:
 *   - a team email in the Lex client registry (lib/lex-config.ts), which also
 *     covers the Saabai Lex demo account (SAABAI_NOTIFY_EMAIL / hello@saabai.ai)
 *   - an approved portal user (Redis portal:users, approved in Saabai admin)
 *   - a Saabai directory user with the Lex product
 *   - an email that already has saved Lex portal settings (existing firms)
 *   - the PlasticOnline team email (PLON_TEAM_EMAIL), used by /plon/login
 *   - anything listed in the optional LEX_PORTAL_ALLOWED_EMAILS env var
 *     (comma-separated). Not required; nothing needs to be set for this to work.
 *
 * Everyone else gets the same "check your inbox" response but no email.
 */
import { createHash } from "crypto";
import { getRedis } from "./redis";
import { getLexClients } from "./lex-config";
import { getPortalUser } from "./portal-users";
import { getDirectoryUser } from "./user-directory";

export const LEX_LINK_TTL_SECONDS = 15 * 60;
const MAX_LINKS_PER_WINDOW = 5;
const RATE_PREFIX = "portal:login:rate:";

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function isKnownLexPortalClient(rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) return false;

  if (getLexClients().some((c) => c.email.teamEmail.trim().toLowerCase() === email)) return true;
  if (envList("LEX_PORTAL_ALLOWED_EMAILS").includes(email)) return true;
  if (envList("PLON_TEAM_EMAIL").includes(email)) return true;

  try {
    if (await getPortalUser(email)) return true;
    const dirUser = await getDirectoryUser(email);
    if (dirUser?.products?.includes("lex")) return true;
    const redis = getRedis();
    if (redis && (await redis.exists(`portal:settings:${email}`))) return true;
  } catch (err) {
    console.error("[lex-portal-access] lookup failed", err instanceof Error ? err.name : err);
  }
  return false;
}

/** Same throttle as the Saabai client portal: max 5 links per email per 15 minutes. */
export async function underLexLinkRateLimit(rawEmail: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `${RATE_PREFIX}${createHash("sha256").update(rawEmail.trim().toLowerCase()).digest("hex")}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, LEX_LINK_TTL_SECONDS);
  return n <= MAX_LINKS_PER_WINDOW;
}
