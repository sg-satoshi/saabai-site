import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  trackFeedback,
  fetchFeedback,
  updateFeedback,
} from "../../../lib/rex-stats";
import type { FeedbackItem, FeedbackCategory, AtlasReview } from "../../../lib/rex-stats";

export const runtime = "edge";

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  pricing_error:   "Pricing Error",
  wrong_material:  "Wrong Material",
  missed_upsell:   "Missed Upsell",
  bad_tone:        "Bad Tone",
  missing_info:    "Missing Info",
  other:           "Other",
};

async function runAtlasReview(
  category: FeedbackCategory,
  message: string
): Promise<AtlasReview | null> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4.6"),
      prompt: `You are Atlas, an AI operations manager reviewing staff feedback about Rex — the AI sales agent at PlasticOnline (Australian cut-to-size plastics supplier). Rex helps customers quote acrylic, polycarbonate, HDPE, and 20+ other engineering plastics.

FEEDBACK CATEGORY: ${CATEGORY_LABELS[category]}
STAFF FEEDBACK: "${message}"

Your job is to assess this feedback and propose a specific fix. Root causes fall into:
- "system_prompt" — Rex's instructions or tone rules need updating
- "knowledge_base" — A fact, product, or material detail is wrong or missing
- "pricing_engine" — A price calculation is wrong (check the deterministic getPricing() function)
- "tool_logic" — Rex called the wrong tool, or called it at the wrong time
- "ui_ux" — A widget or form issue, not Rex's AI logic
- "not_an_issue" — The feedback describes expected behaviour or a misunderstanding

Return ONLY valid JSON — no markdown, no explanation:
{
  "valid": true or false (is this a genuine issue worth fixing?),
  "rootCause": "One sentence: where the problem lives and why",
  "recommendation": "Specific, actionable change — quote the exact text to change, or describe the exact logic fix",
  "confidence": "high" or "medium" or "low"
}`,
    });

    let json = text.trim();
    if (json.startsWith("```")) json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(json);

    return {
      valid:          !!parsed.valid,
      rootCause:      String(parsed.rootCause ?? ""),
      recommendation: String(parsed.recommendation ?? ""),
      confidence:     (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low")
                        ? parsed.confidence
                        : "medium",
      reviewedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// GET — fetch all feedback items
export async function GET() {
  const items = await fetchFeedback();
  return Response.json(items);
}

// POST — submit new feedback + run Atlas review synchronously
export async function POST(req: Request) {
  try {
    const { category, message, leadRef } = await req.json() as {
      category: FeedbackCategory;
      message: string;
      leadRef?: string;
    };

    if (!category || !message?.trim()) {
      return new Response("Missing category or message", { status: 400 });
    }

    const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const item: FeedbackItem = {
      id,
      submittedAt: now,
      category,
      message: message.trim(),
      leadRef,
      status: "submitted",
    };

    // Store immediately
    await trackFeedback(item);

    // Run Atlas review (sync — takes ~2s, acceptable for staff tool)
    const atlasReview = await runAtlasReview(category, message.trim());

    if (atlasReview) {
      await updateFeedback(id, { status: "reviewed", atlasReview });
      return Response.json({ ...item, status: "reviewed", atlasReview });
    }

    return Response.json(item);
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}

// PATCH — update status (approve / mark implemented)
export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json() as { id: string; status: string };
    if (!id || !status) return new Response("Missing id or status", { status: 400 });

    const validStatuses = ["approved", "implemented", "reviewed", "submitted"];
    if (!validStatuses.includes(status)) return new Response("Invalid status", { status: 400 });

    await updateFeedback(id, { status: status as FeedbackItem["status"] });
    return Response.json({ ok: true });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}
