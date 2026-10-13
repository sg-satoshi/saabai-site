/**
 * GET /api/admin/blueprint-stats
 * Today / this week Blueprint order count and revenue (AUD cents).
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { isLiveBlueprintEngagement } from "../../../../lib/live-revenue";
import { listEngagements } from "../../../../lib/audit-store";
import { TIERS } from "../../../../lib/blueprint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/** Brisbane calendar date YYYY-MM-DD (UTC+10, no DST). */
function bneDateString(d = new Date()): string {
  return new Date(d.getTime() + 10 * 3600000).toISOString().slice(0, 10);
}

function amountFor(e: { amountTotal?: number; tier: string }): number {
  if (typeof e.amountTotal === "number") return e.amountTotal;
  const tier = Object.values(TIERS).find((t) => t.engineTier === e.tier);
  return tier ? tier.price * 100 : 0;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || !(await isAdminSession(session.clientId))) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const engagements = await listEngagements();
  // Only live Stripe Checkout payments count (no test-mode or manual drafts).
  const paid = engagements.filter(isLiveBlueprintEngagement);

  const today = bneDateString();
  const weekDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    weekDates.add(bneDateString(new Date(Date.now() - i * 86400000)));
  }

  let todayCount = 0;
  let todayRevenue = 0;
  let weekCount = 0;
  let weekRevenue = 0;
  const allCount = paid.length;
  let allRevenue = 0;

  for (const e of paid) {
    const createdDay = bneDateString(new Date(e.createdAt));
    const cents = amountFor(e);
    allRevenue += cents;
    if (weekDates.has(createdDay)) {
      weekCount += 1;
      weekRevenue += cents;
    }
    if (createdDay === today) {
      todayCount += 1;
      todayRevenue += cents;
    }
  }

  return Response.json({
    todayCount,
    todayRevenue,
    weekCount,
    weekRevenue,
    allCount,
    allRevenue,
  });
}
