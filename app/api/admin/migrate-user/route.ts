/**
 * POST /api/admin/migrate-user
 * One-time migration: update admin email from shane@saabai.ai to hello@saabai.ai
 * Requires admin session.
 */

import { getRedis } from "../../../../lib/redis";
import { verifySessionToken } from "../../../../lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("saabai_session")?.value;

  if (!sessionCookie) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySessionToken(sessionCookie);
  if (!session) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return Response.json({ error: "Redis unavailable" }, { status: 500 });
  }

  try {
    // Get old user
    const oldUserRaw = await redis.hget("portal:users", "shane@saabai.ai");
    if (!oldUserRaw) {
      return Response.json({ error: "Old user not found" }, { status: 404 });
    }

    const oldUser = typeof oldUserRaw === "string" ? JSON.parse(oldUserRaw) : oldUserRaw;

    // Create new user with same details but new email
    const newUser = {
      ...oldUser,
      email: "hello@saabai.ai",
      name: "Saabai Admin",
      id: oldUser.id?.replace("shane", "hello") || "admin_hello",
    };

    // Save new user
    await redis.hset("portal:users", {
      "hello@saabai.ai": JSON.stringify(newUser),
    });

    // Delete old user
    await redis.hdel("portal:users", "shane@saabai.ai");

    return Response.json({
      success: true,
      message: "Admin user migrated from shane@saabai.ai to hello@saabai.ai",
      user: newUser,
    });
  } catch (err) {
    console.error("[migrate-user]", err);
    return Response.json({ error: "Migration failed" }, { status: 500 });
  }
}
