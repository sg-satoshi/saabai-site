/**
 * GET /api/portal/auth?token=xxx
 * Validates magic link token, sets session cookie, redirects to portal.
 *
 * Uses a manual Response with Set-Cookie header — NOT next/headers cookies() + redirect().
 * The cookies()+redirect() combination in Route Handlers doesn't reliably send the cookie
 * in the redirect response in Next.js 15/16.
 */

import { getRedis } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai.ai";

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 48; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function buildCookie(sessionId: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `portal_session=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return Response.redirect(`${BASE_URL}/client-portal?error=missing_token`, 302);
  }

  const redis = getRedis();
  if (!redis) {
    return Response.redirect(`${BASE_URL}/client-portal?error=service_unavailable`, 302);
  }

  // Validate token
  const email = await redis.get(`portal:token:${token}`) as string | null;
  if (!email) {
    return Response.redirect(`${BASE_URL}/client-portal?error=invalid_token`, 302);
  }

  // Consume token — one-time use
  await redis.del(`portal:token:${token}`);

  // Create session in Redis
  const sessionId = generateSessionId();
  await redis.set(
    `portal:session:${sessionId}`,
    JSON.stringify({ email, createdAt: new Date().toISOString() }),
    { ex: SESSION_TTL_SECONDS }
  );

  // Return an HTML page (200 OK) that sets the cookie and redirects via JS.
  // This is more reliable than Set-Cookie on a 302 — browsers always honour
  // cookies on 200 responses before running any scripts.
  const dest = `${BASE_URL}/client-portal`;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Signing in…</title>
  <meta http-equiv="refresh" content="0;url=${dest}">
</head>
<body style="margin:0;background:#0d1b2a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;">
  <p style="color:#8fa3c0;font-size:14px;">Signing you in…</p>
  <script>window.location.replace(${JSON.stringify(dest)});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": buildCookie(sessionId),
      "Cache-Control": "no-store, no-cache",
    },
  });
}
