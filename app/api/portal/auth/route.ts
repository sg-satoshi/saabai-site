/**
 * GET /api/portal/auth?token=xxx
 * Validates magic link token, sets session cookie, redirects to portal.
 */

import { getRedis } from "../../../../lib/redis";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Session TTL: 7 days
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 48; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    redirect("/client-portal?error=missing_token");
  }

  const redis = getRedis();
  if (!redis) {
    redirect("/client-portal?error=service_unavailable");
  }

  // Validate token
  const email = await redis.get(`portal:token:${token}`) as string | null;
  if (!email) {
    redirect("/client-portal?error=invalid_token");
  }

  // Consume token (one-time use)
  await redis.del(`portal:token:${token}`);

  // Create session
  const sessionId = generateSessionId();
  await redis.set(
    `portal:session:${sessionId}`,
    JSON.stringify({ email, createdAt: new Date().toISOString() }),
    { ex: SESSION_TTL_SECONDS }
  );

  // Set httpOnly session cookie
  const cookieStore = await cookies();
  cookieStore.set("portal_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  redirect("/client-portal");
}
