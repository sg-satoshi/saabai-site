import { sweepGrace } from "../../../../lib/lex-subscription";
import { lexMailer } from "../../../../lib/lex-subscription-emails";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Hourly: removes Lex from firms whose 7-day failed-payment grace has ended. Vercel sends Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json({ ok: true, lapsed: await sweepGrace(lexMailer) });
  } catch (err) {
    console.error("[lex grace]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Sweep failed" }, { status: 500 });
  }
}
