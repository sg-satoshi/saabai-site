/**
 * POST /api/audit/engagements/[id]/assessment
 * Generates a draft AI assessment: fact-find data × capability matrix →
 * ranked opportunities with ROI logic. Fact-find v2: opportunities that fix
 * the client's answer 1 are ranked first (see lib/audit-assessment.ts). Admin reviews/edits before it goes
 * anywhere near a client report.
 */

import { generateText } from "ai";
import { getPremiumModel } from "../../../../../../lib/chat-config";
import { requireAdmin } from "../../../../../../lib/audit-admin";
import { getEngagement, logEvent, updateEngagement } from "../../../../../../lib/audit-store";
import { buildAssessmentPrompt, parseAssessmentText } from "../../../../../../lib/audit-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };


export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });

  const prompt = buildAssessmentPrompt(engagement);
  if (!prompt)
    return Response.json(
      { error: "No fact-find responses yet. Complete the fact-find or interview first." },
      { status: 400 }
    );

  const { text } = await generateText({
    model: getPremiumModel(),
    prompt,
  });

  const assessment = parseAssessmentText(text);
  if (!assessment)
    return Response.json(
      { error: "Model returned unparseable output. Try again.", raw: text },
      { status: 502 }
    );
  const opportunities = assessment.opportunities;

  await updateEngagement(id, {
    assessment,
    status:
      engagement.status === "factfind_complete" || engagement.status === "discovery"
        ? "assessment"
        : engagement.status,
  });
  const updated = await logEvent(
    id,
    "assessment_generated",
    "AI assessment generated",
    `${opportunities.length} opportunities`
  );

  return Response.json({ engagement: updated });
}
