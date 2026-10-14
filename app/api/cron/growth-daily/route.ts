import { runGrowthDaily } from "@/lib/growth/growth2";

export const runtime = "nodejs";
export const maxDuration = 60;

// Moves due upsells/testimonial asks into the approval queue and qualifies referrals. Sends nothing.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ ok: true, ...(await runGrowthDaily()) });
}
