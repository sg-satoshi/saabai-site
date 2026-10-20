import { purgeExpiredChatLogs } from "../../../../lib/chat-log";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily retention for the shared chat log. Deletes logger rows older than 90 days.
 * Vercel sends Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // An unset secret must not match the header "Bearer undefined".
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeExpiredChatLogs(90);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[chat-log retention]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Retention failed" }, { status: 500 });
  }
}
