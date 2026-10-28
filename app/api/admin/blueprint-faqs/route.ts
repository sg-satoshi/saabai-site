/**
 * Admin review queue for Blueprint FAQ drafts.
 * Actions move a draft between Saabai review and client approval.
 * There is no publish action, and this route does not email the client.
 */

import { requireAdmin } from "../../../../lib/audit-admin";
import { getEngagement, listEngagements, updateEngagement } from "../../../../lib/audit-store";
import { applyDraftAction } from "../../../../lib/blueprint/onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const engagements = await listEngagements();
  const items = engagements
    .filter((e) => e.faqDrafts && e.faqDrafts.drafts.length > 0)
    .map((e) => ({
      id: e.id,
      firmName: e.firmName,
      contactName: e.contactName,
      generatedAt: e.faqDrafts!.generatedAt,
      questionBank: e.faqDrafts!.questionBank,
      published: false as const,
      onboardingPath: `/audit/onboarding/${e.factFindToken}`,
      drafts: e.faqDrafts!.drafts,
      faqPage: e.faqDrafts!.faqPage,
    }));
  return Response.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { action?: string; engagementId?: string; draftId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.action === "publish") {
    return Response.json({ error: "FAQ drafts are not published from this queue." }, { status: 400 });
  }
  if (body.action !== "to_client" && body.action !== "hold") {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  const engagement = body.engagementId ? await getEngagement(body.engagementId) : null;
  if (!engagement?.faqDrafts || !body.draftId) return Response.json({ error: "Not found" }, { status: 404 });
  const result = applyDraftAction(engagement.faqDrafts, body.action, body.draftId);
  if (result.error && !result.changed) return Response.json({ error: result.error }, { status: 400 });
  const updated = await updateEngagement(engagement.id, { faqDrafts: result.record });
  if (!updated) return Response.json({ error: "Storage unavailable" }, { status: 503 });
  return Response.json({ ok: true, published: false, drafts: result.record.drafts });
}
