import { type NextRequest } from "next/server";
import { loadClients } from "../../../../lib/clients";
import { getDirectoryUser } from "../../../../lib/user-directory";
import { getRedis } from "../../../../lib/redis";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";

const RESET_PREFIX = "saabai:reset:";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required." }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // Check if the email exists — don't reveal whether it does or not
    const envClient = loadClients().find((c) => c.email.toLowerCase() === normalized);
    const dirUser = await getDirectoryUser(normalized);

    // Create a reset token regardless (don't reveal if user exists)
    const token = randomBytes(32).toString("hex");
    const redis = getRedis();

    if (envClient || dirUser) {
      // Store the reset token for 1 hour
      if (redis) {
        await redis.set(`${RESET_PREFIX}${token}`, normalized, { ex: 3600 });
      }
    }

    // In production, you'd send an email here via Resend
    // For now, return the reset link directly (dev mode)
    const origin = new URL(req.url).origin;
    const resetLink = `${origin}/reset-password?token=${token}`;

    return Response.json({
      ok: true,
      resetLink: redis ? resetLink : null, // only provide link if Redis is available
    });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
