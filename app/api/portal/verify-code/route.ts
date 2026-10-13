/**
 * POST /api/portal/verify-code  { email, code }
 * Exchange a 6-digit email code for a portal_session cookie.
 * Same opaque errors whether the email/code is wrong.
 */
import { consumeEmailCode } from "../../../../lib/portal-email-code";
import { signSession } from "../../../../lib/portal-session";
import { createSessionToken, sessionCookieHeader } from "../../../../lib/auth";
import { findEligibleClient } from "../../../../lib/client-magic-link";
import { isKnownLexPortalClient } from "../../../../lib/lex-portal-access";

export const runtime = "nodejs";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function portalCookie(value: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [`portal_session=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_TTL_SECONDS}`];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export async function POST(req: Request) {
  let email = "";
  let code = "";
  try {
    const body = await req.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    code = typeof body.code === "string" ? body.code.trim() : "";
  } catch {
    return Response.json({ error: "That code did not work. Try again or request a new link." }, { status: 400 });
  }
  if (!email.includes("@") || !/^\d{6}$/.test(code)) {
    return Response.json({ error: "That code did not work. Try again or request a new link." }, { status: 400 });
  }

  const rec = await consumeEmailCode(email, code);
  if (!rec) {
    return Response.json({ error: "That code did not work. Try again or request a new link." }, { status: 400 });
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  const isLex = await isKnownLexPortalClient(email);
  if (isLex) {
    headers.append("Set-Cookie", portalCookie(signSession(email)));
  } else {
    const eligible = await findEligibleClient(email);
    if (eligible) {
      headers.append("Set-Cookie", sessionCookieHeader(await createSessionToken(eligible.clientId)));
    }
    // Also set portal session so /api/portal/me works for unified shell
    headers.append("Set-Cookie", portalCookie(signSession(email)));
  }

  return new Response(JSON.stringify({ ok: true, redirect: rec.redirect || "/client-portal" }), { status: 200, headers });
}
