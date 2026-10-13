import { runBillingCron } from "../../../../lib/billing/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ ok: true, ...(await runBillingCron()) });
}
