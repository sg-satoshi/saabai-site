import { sweepDataRetention, sweepGrace } from "../../../../lib/lex-subscription";
import { deleteFirmMatters } from "../../../../lib/lex-matters";
import { firmKeyForEmail } from "../../../../lib/lex-review-access";
import { listDirectoryUsers } from "../../../../lib/user-directory";
import { getRedis } from "../../../../lib/redis";
import { lexMailer } from "../../../../lib/lex-subscription-emails";
import { getStripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Hourly: for firms whose 7-day failed-payment grace has ended, re-checks the live Stripe subscription, then lapses or restores. Also deletes cancelled firms' Lex data after 30 days (clause 10.7). Vercel sends Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sweepGrace(lexMailer, async (id) => (await getStripe().subscriptions.retrieve(id)).status);
    const data = await sweepDataRetention(
      { matters: deleteFirmMatters, threads: async (e) => { await getRedis()?.del(`lex:threads:${e.toLowerCase()}`); } },
      firmKeyForEmail,
      async () => (await listDirectoryUsers()).filter((u) => u.products?.includes("lex") && u.email).map((u) => u.email.toLowerCase()),
    );
    return Response.json({ ok: true, result, data });
  } catch (err) {
    console.error("[lex grace]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Sweep failed" }, { status: 500 });
  }
}
