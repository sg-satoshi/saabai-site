/**
 * POST /api/portal/login
 * Sends a magic link to the firm's email address, but only if it belongs to a
 * known Lex portal client (see lib/lex-portal-access.ts). The response is
 * identical either way, and the work runs after the response is sent, so the
 * endpoint can't be used to find out who is a client or to spam inboxes.
 * Rate limited to 5 links per email per 15 minutes (same as the client portal).
 * Token is stored in Redis with a 15-minute TTL.
 */

import { getRedis } from "../../../../lib/redis";
import { EMAIL_BRAND, sendBrandedEmail } from "../../../../lib/email/branded-layout";
import { portalMagicLinkEmail } from "../../../../lib/email/templates";
import { randomBytes } from "crypto";
import { safeRedirect } from "../../../../lib/safe-redirect";
import { runAfterResponse } from "../../../../lib/run-after";
import { isKnownLexPortalClient, underLexLinkRateLimit, LEX_LINK_TTL_SECONDS } from "../../../../lib/lex-portal-access";
import { findEligibleClient, processMagicLinkRequest } from "../../../../lib/client-magic-link";
import { generateEmailCode, storeEmailCode, underCodeRateLimit } from "../../../../lib/portal-email-code";
import { getLexClients } from "../../../../lib/lex-config";

export const runtime = "nodejs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai.ai";

// 256-bit crypto-random, URL-safe token (was Math.random, which is predictable).
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function POST(req: Request) {
  let email: unknown;
  let redirectParam: unknown;
  try {
    ({ email, redirect: redirectParam } = await req.json());
  } catch {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !email.includes("@") || email.length > 254) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const normalised = email.trim().toLowerCase();
  runAfterResponse(() => sendLinkIfKnown(normalised, redirectParam));
  return Response.json({ ok: true });
}

async function sendLinkIfKnown(normalised: string, redirectParam: unknown): Promise<void> {
  try {
    const isLex = await isKnownLexPortalClient(normalised);
    const eligible = await findEligibleClient(normalised);
    if (!isLex && !eligible) return;

    // Directory / env clients (non-Lex) use the shared magic-link + code helper.
    if (!isLex && eligible) {
      await processMagicLinkRequest(normalised, redirectParam || "/client-portal");
      return;
    }

    if (!(await underLexLinkRateLimit(normalised))) return;

    const redis = getRedis();
    if (!redis) {
      console.error("[portal/login] Redis unavailable");
      return;
    }

    const token = generateToken();
    await redis.set(`portal:token:${token}`, normalised, { ex: LEX_LINK_TTL_SECONDS });

    // Only persist a redirect when the caller sent a safe same-origin path.
    // Missing/unsafe values fall back to /client-portal in /api/portal/auth.
    const safe = safeRedirect(redirectParam, "");
    if (safe) {
      await redis.set(`portal:redirect:${token}`, safe, { ex: LEX_LINK_TTL_SECONDS });
    }

    const link = `${BASE_URL}/api/portal/auth?token=${token}`;
    let code: string | null = null;
    if (await underCodeRateLimit(normalised)) {
      code = generateEmailCode();
      const firm = getLexClients().find((c) => c.email.teamEmail.toLowerCase() === normalised);
      await storeEmailCode(normalised, code, { clientId: firm?.id ?? "lex-external", redirect: safe });
    }

    const branded = portalMagicLinkEmail({ name: normalised.split("@")[0], link, code });
    const sent = await sendBrandedEmail({
      to: normalised,
      email: branded,
      from: EMAIL_BRAND.fromPortal,
    });
    if (!sent && process.env.NODE_ENV !== "production") {
      console.log("[portal/login] (dev) magic link:", link, "code:", code);
    }
  } catch (err) {
    console.error("[portal/login]", err instanceof Error ? err.message : err);
  }
}
