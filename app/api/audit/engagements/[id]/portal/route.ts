/** GET /api/audit/engagements/[id]/portal (admin): portal status, completeness and answers for the admin Portal tab. */
import { requireAdmin } from "../../../../../../lib/audit-admin";
import { getEngagement } from "../../../../../../lib/audit-store";
import { portalAllowed, portalMode } from "../../../../../../lib/portal-blueprint/flag";
import { answersOf, computeProgress, planQuestions, planSections } from "../../../../../../lib/portal-blueprint/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const e = await getEngagement(id);
  if (!e) return Response.json({ error: "Not found" }, { status: 404 });
  const answers = answersOf(e);
  const progress = computeProgress(e, answers);
  const snap = e.portal?.lockedSnapshot;
  const status = e.portal?.submittedAt ? "submitted" : progress.answered > 0 ? "in_progress" : "not_started";
  const sections = planSections(e).map((s) => ({
    ...s,
    questions: planQuestions(e)
      .filter((q) => q.section === s.id)
      .map((q) => {
        const r = e.responses[q.id];
        const frozen = snap?.[q.id];
        return {
          id: q.id,
          label: q.label,
          required: Boolean(q.required),
          value: r?.value ?? null,
          by: r ? r.mode : null,
          answeredAt: r?.answeredAt ?? null,
          changedSinceSubmit: Boolean(snap) && JSON.stringify(frozen?.value ?? null) !== JSON.stringify(r?.value ?? null),
        };
      }),
  }));
  return Response.json({
    mode: portalMode(),
    allowedForClient: portalAllowed(e.contactEmail),
    status,
    submittedAt: e.portal?.submittedAt ?? null,
    reopenedAt: e.portal?.reopenedAt ?? [],
    lastClientActivityAt: e.portal?.lastClientActivityAt ?? null,
    lastLoginAt: e.portal?.lastLoginAt ?? null,
    progress: { percent: progress.percent, answered: progress.answered, total: progress.totalQuestions, missingRequired: progress.missingRequired, sections: progress.sections },
    sections,
  });
}
