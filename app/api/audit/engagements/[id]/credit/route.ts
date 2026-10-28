/**
 * POST /api/audit/engagements/[id]/credit
 * Record Blueprint credit used by a signed quote or a deposit.
 * Admin only. A booked call is rejected. Does not touch Stripe.
 */
import { requireAdmin } from "../../../../../../lib/audit-admin";
import { getEngagement, logEvent, updateEngagement } from "../../../../../../lib/audit-store";
import { planCreditApplication } from "../../../../../../lib/blueprint-credit";
import { newId } from "../../../../../../lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { cents?: unknown; kind?: unknown; reference?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planned = planCreditApplication(engagement, body, new Date(), newId("crd"));
  if (!planned.ok) return Response.json({ error: planned.error }, { status: 400 });

  const saved = await updateEngagement(id, {
    creditApplications: planned.applications,
    creditUsedCents: planned.creditUsedCents,
  });
  if (!saved) return Response.json({ error: "Not found" }, { status: 404 });

  const withEvent = await logEvent(id, "credit_applied", "Blueprint credit applied to a build", planned.detail);
  return Response.json({ engagement: withEvent ?? saved });
}
