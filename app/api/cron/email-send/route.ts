import { runEmailCron } from "../../../../lib/email/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Drains the SES outbox and queues due welcome-series steps.
 * Schedule is every minute in vercel.json. This repo already runs a 15-minute
 * cron, which needs Vercel Pro, and Pro allows a one-minute cron. If a deploy
 * rejects a one-minute schedule, use every 15 minutes instead. The outbox is idempotent.
 * the outbox is idempotent and will catch up.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await runEmailCron());
  } catch (e) {
    console.error("email cron failed:", e instanceof Error ? e.message : "error");
    return Response.json({ ok: false, error: "cron failed" }, { status: 500 });
  }
}
