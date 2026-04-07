/**
 * GET /api/portal/me
 * Returns the authenticated firm's details by verifying the signed session cookie.
 * No Redis lookup — the HMAC signature IS the proof of authenticity.
 *
 * DELETE /api/portal/me
 * Signs out by clearing the session cookie.
 */

import { getLexClients } from "../../../../lib/lex-config";
import { verifySession } from "../../../../lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

export async function GET(req: Request) {
  try {
    const sessionToken = parseCookie(req.headers.get("cookie"), "portal_session");

    if (!sessionToken) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const session = verifySession(sessionToken);
    if (!session) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    // Look up firm config by matching team email
    const clients = getLexClients();
    const firmConfig = clients.find(
      (c) => c.email.teamEmail.toLowerCase() === session.email.toLowerCase()
    );

    return Response.json({
      authenticated: true,
      email: session.email,
      firmName: firmConfig?.firmName ?? "Your Law Firm",
      clientId: firmConfig?.id ?? "lex-external",
      agentName: firmConfig?.agentName ?? "Lex",
      plan: "Professional",
    });
  } catch (err) {
    console.error("[portal/me]", err);
    return Response.json({ authenticated: false }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const isProd = process.env.NODE_ENV === "production";
  const clearCookie = [
    "portal_session=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    ...(isProd ? ["Secure"] : []),
  ].join("; ");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearCookie,
    },
  });
}
