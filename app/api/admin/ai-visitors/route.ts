import { requireAdminSession } from "@/lib/admin-guard";
import { listAnalyticsSites } from "@/lib/ai-visitors/sites";
import {
  addIsoDays,
  backfillStart,
  brisbaneToday,
  buildView,
  collectRange,
  loadSnapshots,
  readMeta,
} from "@/lib/ai-visitors/snapshot";
import type { DaySnapshot } from "@/lib/ai-visitors/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  return message.replace(/Bearer\s+\S+/gi, "Bearer").slice(0, 300);
}

export async function GET(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const requested = Number(new URL(req.url).searchParams.get("days") || 30);
  const days = requested === 7 || requested === 90 ? requested : 30;
  try {
    const sites = await listAnalyticsSites();
    const snapshots: Record<string, DaySnapshot[]> = {};
    await Promise.all(sites.map(async (site) => {
      snapshots[site.key] = await loadSnapshots(site.key);
    }));
    const view = buildView({ sites, snapshots, days });
    const meta = await readMeta();
    return Response.json({ ...view, lastRunAt: meta.lastRunAt, lastError: meta.lastError });
  } catch (error) {
    return Response.json({ error: safeMessage(error, "Couldn't load AI visitor data") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { action?: string; from?: string };
  const today = brisbaneToday();
  const refresh = body.action === "refresh";
  const from = refresh
    ? addIsoDays(today, -1)
    : (body.from && /^\d{4}-\d{2}-\d{2}$/.test(body.from) ? body.from : backfillStart(today));
  try {
    const sites = await listAnalyticsSites();
    const result = await collectRange({
      sites,
      from,
      to: today,
      maxDays: 2,
      budgetMs: 45_000,
    });
    return Response.json({ ok: true, action: refresh ? "refresh" : "backfill", ...result });
  } catch (error) {
    return Response.json({ error: safeMessage(error, "Couldn't refresh AI visitor data") }, { status: 500 });
  }
}
