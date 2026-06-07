import { type NextRequest } from "next/server";
import { loadClients } from "../../../../lib/clients";
import { getRedis } from "../../../../lib/redis";
import { getDirectoryUser, saveDirectoryUser } from "../../../../lib/user-directory";

export const runtime = "nodejs";

const RESET_PREFIX = "saabai:reset:";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const redis = getRedis();
    if (!redis) {
      return Response.json({ error: "Password reset is unavailable." }, { status: 500 });
    }

    // Look up the token
    const email = await redis.get<string>(`${RESET_PREFIX}${token}`);
    if (!email) {
      return Response.json(
        { error: "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    const normalized = email.toLowerCase();

    // Update env-var client? Can't — env vars are read-only.
    // Check if it's an env-var client
    const envClient = loadClients().find((c) => c.email.toLowerCase() === normalized);
    if (envClient) {
      // Env-var clients can't reset via Redis. Clear the token and return error.
      await redis.del(`${RESET_PREFIX}${token}`);
      return Response.json(
        { error: "This account uses environment-based credentials and cannot be reset via this form. Contact hello@saabai.ai for assistance." },
        { status: 400 }
      );
    }

    // Update Redis directory user
    const dirUser = await getDirectoryUser(normalized);
    if (!dirUser) {
      await redis.del(`${RESET_PREFIX}${token}`);
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    dirUser.password = password;
    await saveDirectoryUser(dirUser);

    // Delete the reset token
    await redis.del(`${RESET_PREFIX}${token}`);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
