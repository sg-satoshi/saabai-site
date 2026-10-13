import { requireAdminSession } from "../../../../../lib/admin-guard";
import { listSiteBilling } from "../../../../../lib/billing/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const recs = await listSiteBilling().catch(() => []);
  return Response.json({
    records: recs.map((r) => ({
      siteId: r.siteId, status: r.status, planName: r.planName, monthlyCents: r.monthlyCents, contact: r.contact,
      linkSentAt: r.linkSentAt, linkExpiresAt: r.linkExpiresAt, failedAt: r.failedAt, dunningSent: r.dunningSent || 0,
      currentPeriodEnd: r.currentPeriodEnd, stripeCustomerId: r.stripeCustomerId, history: (r.history || []).slice(-8),
    })),
  });
}
