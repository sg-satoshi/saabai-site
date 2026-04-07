/**
 * GET /api/portal/me
 * Returns the authenticated firm's details from the session cookie.
 * Used by the client portal to check auth state on mount.
 */

import { getRedis } from "../../../../lib/redis";
import { cookies } from "next/headers";
import { getLexClients } from "../../../../lib/lex-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return undefined;
}

export async function GET(req: Request) {
  try {
    // Read cookie directly from request headers — more reliable than next/headers
    // cookies() in Route Handlers has known issues in some Next.js 15 deployments.
    const sessionId =
      parseCookie(req.headers.get("cookie"), "portal_session") ||
      (await cookies()).get("portal_session")?.value;

    if (!sessionId) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const redis = getRedis();
    if (!redis) {
      return Response.json({ authenticated: false }, { status: 503 });
    }

    const raw = await redis.get(`portal:session:${sessionId}`) as string | null;
    if (!raw) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const session = JSON.parse(raw) as { email: string; createdAt: string };

    // Look up firm config by matching notification email
    // Falls back to default external config if no match
    const clients = getLexClients();
    const firmConfig = clients.find(
      c => c.email.teamEmail.toLowerCase() === session.email.toLowerCase()
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

export async function DELETE() {
  // Sign out — clear session cookie
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("portal_session")?.value;

    if (sessionId) {
      const redis = getRedis();
      if (redis) await redis.del(`portal:session:${sessionId}`);
    }

    cookieStore.set("portal_session", "", { maxAge: 0, path: "/" });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[portal/signout]", err);
    return Response.json({ error: "Sign out failed" }, { status: 500 });
  }
}
