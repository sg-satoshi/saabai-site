/**
 * POST /api/audit/engagements/[id]/assessment
 * Generates a draft AI assessment: fact-find data × capability matrix →
 * ranked opportunities with ROI logic. Admin reviews/edits before it goes
 * anywhere near a client report.
 */

import { generateText } from "ai";
import { getPremiumModel } from "../../../../../../lib/chat-config";
import { requireAdmin } from "../../../../../../lib/audit-admin";
import { getEngagement, logEvent, updateEngagement } from "../../../../../../lib/audit-store";
import { questionsForTier } from "../../../../../../lib/audit-factfind";
import { matrixAsPromptContext } from "../../../../../../lib/audit-capability-matrix";
import {
  AuditAssessment,
  AuditOpportunity,
  newId,
} from "../../../../../../lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

const TIER_OPPORTUNITY_COUNT: Record<string, string> = {
  essential: "exactly 3",
  professional: "6 to 8",
  enterprise: "10 to 15",
};

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });

  // Render fact-find Q&A as prompt context
  const questions = questionsForTier(engagement.tier, engagement.firmType);
  const qa = questions
    .map((q) => {
      const r = engagement.responses[q.id];
      if (!r || r.value === null || r.value === "") return null;
      const val = Array.isArray(r.value) ? r.value.join(", ") : String(r.value);
      return `Q: ${q.label}\nA (${r.mode}): ${val}`;
    })
    .filter(Boolean)
    .join("\n\n");

  if (!qa)
    return Response.json(
      { error: "No fact-find responses yet — complete the fact-find or interview first" },
      { status: 400 }
    );

  const workflows = engagement.workflows
    .map(
      (w) =>
        `- ${w.name}${w.hoursPerWeek ? ` (~${w.hoursPerWeek}h/wk)` : ""}${w.description ? `: ${w.description}` : ""}`
    )
    .join("\n");

  const goals = engagement.goals.map((g) => `- ${g.text}`).join("\n");

  const prompt = `You are the senior AI-automation strategist at Saabai.ai, preparing the internal assessment for a fixed-price AI Audit of an Australian professional firm. Your analysis becomes the backbone of the written audit report.

CLIENT PROFILE
Firm: ${engagement.firmName} (${engagement.firmType}, ${engagement.firmSize ?? "size unknown"})
Tier purchased: ${engagement.tier}
Contact: ${engagement.contactName}

FACT-FIND RESPONSES
${qa}
${workflows ? `\nADDITIONAL WORKFLOWS CAPTURED\n${workflows}` : ""}
${goals ? `\nSTATED GOALS\n${goals}` : ""}

CAPABILITY MATRIX (automation patterns proven for firms like this — reference by [id])
${matrixAsPromptContext(engagement.firmType)}

TASK
Identify the ${TIER_OPPORTUNITY_COUNT[engagement.tier] ?? "top"} automation opportunities, ranked by ROI (impact × ease). For each, ground estimates in the client's OWN numbers from the fact-find (hours, volumes, team size) — never invent figures; where data is missing, state the assumption. Map each to a capability-matrix pattern id where one fits; use patternId "custom" only if nothing fits. Be honest: if something is low-value or premature, exclude it. Tie opportunities to the client's stated goals where possible.

Respond with ONLY valid JSON (no markdown fences) in this exact shape:
{
  "summary": "3-5 sentence executive summary of the firm's automation position and biggest lever",
  "quickWins": "1-3 sentences on what they could do in the first 30 days",
  "risks": "1-3 sentences on constraints/risks (compliance, change management, data)",
  "opportunities": [
    {
      "title": "string",
      "description": "2-4 sentences: what gets built and how it works in their context",
      "patternId": "matrix id or 'custom'",
      "hoursSavedPerWeek": number,
      "complexity": "low" | "medium" | "high",
      "costBandAud": "$Xk–$Yk",
      "roiNotes": "the arithmetic: their numbers × the logic, stated plainly"
    }
  ]
}`;

  const { text } = await generateText({
    model: getPremiumModel(),
    prompt,
  });

  // Parse — strip accidental code fences
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: {
    summary?: string;
    quickWins?: string;
    risks?: string;
    opportunities?: Array<Partial<AuditOpportunity>>;
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json(
      { error: "Model returned unparseable output — try again", raw: text },
      { status: 502 }
    );
  }

  const opportunities: AuditOpportunity[] = (parsed.opportunities ?? []).map(
    (o, i) => ({
      id: newId("opp"),
      title: String(o.title ?? `Opportunity ${i + 1}`),
      description: String(o.description ?? ""),
      patternId: o.patternId ? String(o.patternId) : undefined,
      hoursSavedPerWeek:
        typeof o.hoursSavedPerWeek === "number" ? o.hoursSavedPerWeek : undefined,
      complexity: (["low", "medium", "high"] as const).includes(
        o.complexity as "low"
      )
        ? (o.complexity as "low" | "medium" | "high")
        : "medium",
      costBandAud: o.costBandAud ? String(o.costBandAud) : undefined,
      roiNotes: o.roiNotes ? String(o.roiNotes) : undefined,
      rank: i + 1,
      status: "proposed",
    })
  );

  const assessment: AuditAssessment = {
    generatedAt: new Date().toISOString(),
    summary: String(parsed.summary ?? ""),
    quickWins: parsed.quickWins ? String(parsed.quickWins) : undefined,
    risks: parsed.risks ? String(parsed.risks) : undefined,
    opportunities,
    modelNotes: "AI-generated draft — review and edit before client delivery.",
  };

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
