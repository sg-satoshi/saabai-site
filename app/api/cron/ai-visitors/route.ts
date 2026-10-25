import { listAnalyticsSites } from "@/lib/ai-visitors/sites";
import { addIsoDays, brisbaneToday, collectRange, markRun } from "@/lib/ai-visitors/snapshot";

export const runtime = "nodejs";
export const maxDuration = 60;

// Previous Brisbane day (cron is 16:30 UTC, 2:30am Brisbane). Stores one snapshot per site.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = addIsoDays(brisbaneToday(), -1);
  try {
    const sites = await listAnalyticsSites();
    const result = await collectRange({ sites, from: date, to: date, maxDays: 1, budgetMs: 50_000 });
    return Response.json({ ok: true, date, sites: sites.length, stored: result.stored.length, truncated: result.truncated });
  } catch (error) {
    const message = (error instanceof Error ? error.message : "AI visitor snapshot failed")
      .replace(/Bearer\s+\S+/gi, "Bearer")
      .slice(0, 300);
    await markRun(date, message).catch(() => undefined);
    return Response.json({ error: message }, { status: 500 });
  }
}
