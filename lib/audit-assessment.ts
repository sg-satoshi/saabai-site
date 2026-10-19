/**
 * Blueprint assessment: prompt building and output parsing, kept pure so it
 * can be tested without a model call. The route in
 * app/api/audit/engagements/[id]/assessment calls the model in between.
 *
 * Fact-find v2: the client's three "Start here" answers lead the prompt.
 * Opportunities that fix answer 1 are ranked first, answer 2 tells us what
 * not to repeat, and answer 3 gets a direct response.
 */

import { questionsForTier, START_QUESTION_IDS } from "./audit-factfind";
import { matrixAsPromptContext } from "./audit-capability-matrix";
import {
  AuditAssessment,
  AuditEngagement,
  AuditOpportunity,
  newId,
} from "./audit-types";
import { noDashes, NO_DASH_RULE } from "./no-dashes";

export const TIER_OPPORTUNITY_COUNT: Record<string, string> = {
  starter: "exactly 3",
  pro: "6 to 8",
  business: "10 to 15",
};

const START_IDS = new Set<string>(Object.values(START_QUESTION_IDS));

/** The client's own words for the three Start here questions (trimmed, or undefined). */
export function startAnswers(eng: AuditEngagement): {
  frustration?: string;
  tried?: string;
  wish?: string;
} {
  const get = (id: string) => {
    const v = eng.responses?.[id]?.value;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  return {
    frustration: get(START_QUESTION_IDS.frustration),
    tried: get(START_QUESTION_IDS.tried),
    wish: get(START_QUESTION_IDS.wish),
  };
}

/** Returns the prompt, or null when there are no fact-find answers to work from. */
export function buildAssessmentPrompt(engagement: AuditEngagement): string | null {
  const questions = questionsForTier(engagement.tier, engagement.firmType);
  const qa = questions
    .filter((q) => !START_IDS.has(q.id))
    .map((q) => {
      const r = engagement.responses[q.id];
      if (!r || r.value === null || r.value === "") return null;
      const val = Array.isArray(r.value) ? r.value.join(", ") : String(r.value);
      return `Q: ${q.label}\nA (${r.mode}): ${val}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const told = startAnswers(engagement);
  const hasTold = Boolean(told.frustration || told.tried || told.wish);
  if (!qa && !hasTold) return null;

  const workflows = engagement.workflows
    .map(
      (w) =>
        `- ${w.name}${w.hoursPerWeek ? ` (~${w.hoursPerWeek}h/wk)` : ""}${w.description ? `: ${w.description}` : ""}`
    )
    .join("\n");

  const goals = engagement.goals.map((g) => `- ${g.text}`).join("\n");

  const toldBlock = hasTold
    ? `
WHAT THEY TOLD US (their own words, these lead the Blueprint)
1. What's frustrating them most right now: ${told.frustration ?? "(not answered)"}
2. What they've already tried, and how it went: ${told.tried ?? "(not answered)"}
3. What they wish people selling AI or tech understood: ${told.wish ?? "(not answered)"}
`
    : "";

  const toldRules = hasTold
    ? `
HOW TO USE "WHAT THEY TOLD US"
- Rank opportunities that directly fix answer 1 first, then the rest by ROI. Set "fixesMainFrustration": true only on those that directly fix answer 1.
- Read answer 2 closely. Do not recommend anything that repeats what already failed for them, unless you say plainly why this time is different. Summarise what you are deliberately not repeating in "avoidRepeating".
- In "concernsNote", respond directly and honestly to answer 3 in 2 to 3 plain sentences written to the client. No sales talk, no pressure.
`
    : "";

  return `You are the senior AI-automation strategist at Saabai.ai, preparing the internal assessment for a fixed-price Saabai Blueprint for an Australian business. Your analysis becomes the backbone of the written Blueprint.

CLIENT PROFILE
Firm: ${engagement.firmName} (${engagement.firmType}, ${engagement.firmSize ?? "size unknown"})
Tier purchased: ${engagement.tier}
Contact: ${engagement.contactName}
${toldBlock}
FACT-FIND RESPONSES
${qa || "(none beyond the answers above)"}
${workflows ? `\nADDITIONAL WORKFLOWS CAPTURED\n${workflows}` : ""}
${goals ? `\nSTATED GOALS\n${goals}` : ""}

CAPABILITY MATRIX (automation patterns proven for firms like this, reference by [id])
${matrixAsPromptContext(engagement.firmType)}

TASK
Identify the ${TIER_OPPORTUNITY_COUNT[engagement.tier] ?? "top"} automation opportunities, ranked by ROI (impact x ease). For each, ground estimates in the client's OWN numbers from the fact-find (hours, volumes, team size). Never invent figures; where data is missing, state the assumption. Map each to a capability-matrix pattern id where one fits; use patternId "custom" only if nothing fits. Be honest: if something is low-value or premature, exclude it. Tie opportunities to the client's stated goals where possible.
${toldRules}
STYLE
Plain Australian English. ${NO_DASH_RULE}

Respond with ONLY valid JSON (no markdown fences) in this exact shape:
{
  "summary": "3-5 sentence executive summary of the firm's automation position and biggest lever",
  "quickWins": "1-3 sentences on what they could do in the first 30 days",
  "risks": "1-3 sentences on constraints/risks (compliance, change management, data)",
  "avoidRepeating": "1-2 sentences on what we are deliberately not repeating from answer 2, or an empty string",
  "concernsNote": "2-3 sentences responding directly to answer 3, or an empty string",
  "opportunities": [
    {
      "title": "string",
      "description": "2-4 sentences: what gets built and how it works in their context",
      "patternId": "matrix id or 'custom'",
      "fixesMainFrustration": true or false,
      "hoursSavedPerWeek": number,
      "complexity": "low" | "medium" | "high",
      "costBandAud": "$Xk-$Yk",
      "roiNotes": "the arithmetic: their numbers x the logic, stated plainly"
    }
  ]
}`;
}

type RawOpp = Partial<AuditOpportunity> & { fixesMainFrustration?: unknown };

/** Opportunities that fix answer 1 first (stable), then the model's ROI order. Ranks renumbered from 1. */
export function rankAgainstFrustration(opps: AuditOpportunity[]): AuditOpportunity[] {
  const first = opps.filter((o) => o.fixesMainFrustration);
  const rest = opps.filter((o) => !o.fixesMainFrustration);
  return [...first, ...rest].map((o, i) => ({ ...o, rank: i + 1 }));
}

const clean = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = noDashes(String(v)).trim();
  return s ? s : undefined;
};

/** Parse the model's JSON text into an assessment. Returns null if it is not valid JSON. */
export function parseAssessmentText(text: string, now = new Date()): AuditAssessment | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: {
    summary?: string;
    quickWins?: string;
    risks?: string;
    avoidRepeating?: string;
    concernsNote?: string;
    opportunities?: RawOpp[];
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  const opportunities: AuditOpportunity[] = (Array.isArray(parsed.opportunities) ? parsed.opportunities : []).map(
    (o, i) => ({
      id: newId("opp"),
      title: clean(o.title) ?? `Opportunity ${i + 1}`,
      description: clean(o.description) ?? "",
      patternId: o.patternId ? String(o.patternId) : undefined,
      hoursSavedPerWeek:
        typeof o.hoursSavedPerWeek === "number" ? o.hoursSavedPerWeek : undefined,
      complexity: (["low", "medium", "high"] as const).includes(o.complexity as "low")
        ? (o.complexity as "low" | "medium" | "high")
        : "medium",
      // A price range: any dash becomes a plain hyphen ("$3k–$5k" to "$3k-$5k").
      costBandAud: o.costBandAud ? String(o.costBandAud).replace(/\s*[\u2012-\u2015]\s*/g, "-").trim() || undefined : undefined,
      roiNotes: clean(o.roiNotes),
      fixesMainFrustration: o.fixesMainFrustration === true,
      rank: i + 1,
      status: "proposed",
    })
  );

  return {
    generatedAt: now.toISOString(),
    summary: clean(parsed.summary) ?? "",
    quickWins: clean(parsed.quickWins),
    risks: clean(parsed.risks),
    avoidRepeating: clean(parsed.avoidRepeating),
    concernsNote: clean(parsed.concernsNote),
    opportunities: rankAgainstFrustration(opportunities),
    modelNotes: "AI-generated draft. Review and edit before client delivery.",
  };
}
