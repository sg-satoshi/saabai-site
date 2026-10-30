import { sweepGrace } from "../../../../lib/lex-subscription";
import { lexMailer } from "../../../../lib/lex-subscription-emails";
import { getStripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Hourly: for firms whose 7-day failed-payment grace has ended, re-checks the live Stripe subscription, then lapses or restores. Vercel sends Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json({ ok: true, result: await sweepGrace(lexMailer, async (id) => (await getStripe().subscriptions.retrieve(id)).status) });
  } catch (err) {
    console.error("[lex grace]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Sweep failed" }, { status: 500 });
  }
}
