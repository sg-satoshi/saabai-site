/**
 * GET    /api/audit/engagements/[id] — fetch one engagement (admin)
 * PATCH  /api/audit/engagements/[id] — update fields (admin)
 * DELETE /api/audit/engagements/[id] — delete (admin)
 */

import { requireAdmin } from "../../../../../lib/audit-admin";
import {
  addEngagementNote,
  deleteEngagement,
  getEngagement,
  logEvent,
  saveResponses,
  updateEngagement,
} from "../../../../../lib/audit-store";
import {
  AUDIT_STATUS_LABELS,
  AuditEngagement,
  AuditStatus,
  FactFindResponse,
} from "../../../../../lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ engagement });
}

// Fields the admin UI may patch directly
const PATCHABLE: (keyof AuditEngagement)[] = [
  "tier",
  "status",
  "firmName",
  "firmType",
  "firmSize",
  "website",
  "location",
  "contactName",
  "contactEmail",
  "contactPhone",
  "stakeholders",
  "tools",
  "workflows",
  "goals",
  "assessment",
  "stripeRef",
  "calendlyRef",
];

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Special action: add a note
  if (typeof body.addNote === "string" && body.addNote.trim()) {
    const engagement = await addEngagementNote(id, body.addNote, "Admin");
    if (!engagement)
      return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ engagement });
  }

  // Special action: save interview-mode responses
  if (Array.isArray(body.responses)) {
    const responses = (body.responses as FactFindResponse[]).map((r) => ({
      questionId: String(r.questionId),
      value: r.value ?? null,
      answeredAt: new Date().toISOString(),
      mode: "interview" as const,
    }));
    const engagement = await saveResponses(id, responses);
    if (!engagement)
      return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ engagement });
  }

  const patch: Partial<AuditEngagement> = {};
  for (const key of PATCHABLE) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (patch as any)[key] = body[key];
    }
  }
  if (Object.keys(patch).length === 0)
    return Response.json({ error: "Nothing to update" }, { status: 400 });

  // Log manual status changes to the timeline
  const before = await getEngagement(id);
  let engagement = await updateEngagement(id, patch);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });

  if (
    before &&
    typeof patch.status === "string" &&
    patch.status !== before.status
  ) {
    engagement =
      (await logEvent(
        id,
        "status_changed",
        `Status changed to ${AUDIT_STATUS_LABELS[patch.status as AuditStatus] ?? patch.status}`,
        `was ${AUDIT_STATUS_LABELS[before.status] ?? before.status}`
      )) ?? engagement;
  }
  return Response.json({ engagement });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const ok = await deleteEngagement(id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ deleted: true });
}
