import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { Resend } from "resend";
import {
  trackFeedback,
  fetchFeedback,
  updateFeedback,
} from "../../../lib/rex-stats";
import type { FeedbackItem, FeedbackCategory, AtlasReview } from "../../../lib/rex-stats";

export const runtime = "edge";

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = process.env.SAABAI_NOTIFY_EMAIL ?? "hello@saabai.ai";
const FROM_EMAIL   = "Rex Feedback <alerts@saabai.ai>";

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

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  pricing_error:  "#dc2626",
  wrong_material: "#d97706",
  missed_upsell:  "#7c3aed",
  bad_tone:       "#0369a1",
  missing_info:   "#059669",
  other:          "#6b7280",
};

async function sendFeedbackNotification(item: FeedbackItem): Promise<void> {
  const catLabel = CATEGORY_LABELS[item.category];
  const catColor = CATEGORY_COLORS[item.category];
  const review   = item.atlasReview;

  const atlasBlock = review ? `
    <div style="margin-top:20px;padding:16px 20px;background:#f8fafc;border-left:3px solid ${review.valid ? "#059669" : "#6b7280"};border-radius:0 8px 8px 0;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Atlas Review · ${review.confidence} confidence</p>
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${review.valid ? "#059669" : "#6b7280"};">${review.valid ? "✓ Genuine issue" : "✗ Not flagged as an issue"}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#374151;"><strong>Root cause:</strong> ${review.rootCause}</p>
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Recommendation:</strong> ${review.recommendation}</p>
    </div>` : "";

  const leadLine = item.leadRef
    ? `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Lead ref: <strong style="color:#374151;">${item.leadRef}</strong></p>`
    : "";

  await resend.emails.send({
    from: FROM_EMAIL,
    to:   NOTIFY_EMAIL,
    subject: `Rex Feedback: ${catLabel}`,
    html: `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 0;">
      <div style="margin-bottom:24px;">
        <span style="display:inline-block;padding:4px 10px;border-radius:6px;background:${catColor}18;color:${catColor};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${catLabel}</span>
      </div>
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#111827;">New Rex Feedback</h2>
      <div style="padding:16px 20px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:4px;">
        <p style="margin:0 0 4px;font-size:13px;color:#374151;">${item.message}</p>
      </div>
      ${leadLine}
      <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">${new Date(item.submittedAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} AEST</p>
      ${atlasBlock}
      <div style="margin-top:28px;">
        <a href="https://saabai.ai/rex-dashboard" style="display:inline-block;padding:10px 20px;background:#e13f00;color:#fff;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">Review in Dashboard →</a>
      </div>
    </div>`,
  });
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

    const finalItem: FeedbackItem = atlasReview
      ? { ...item, status: "reviewed", atlasReview }
      : item;

    if (atlasReview) {
      await updateFeedback(id, { status: "reviewed", atlasReview });
    }

    // Fire-and-forget notification email
    sendFeedbackNotification(finalItem).catch(() => {});

    return Response.json(finalItem);
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}

// PATCH — update status (approve / mark implemented) with audit timestamps
export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json() as { id: string; status: string };
    if (!id || !status) return new Response("Missing id or status", { status: 400 });

    const validStatuses = ["approved", "implemented", "reviewed", "submitted"];
    if (!validStatuses.includes(status)) return new Response("Invalid status", { status: 400 });

    const now = new Date().toISOString();
    const updates: Partial<FeedbackItem> = { status: status as FeedbackItem["status"] };
    if (status === "approved")     updates.approvedAt     = now;
    if (status === "implemented")  updates.implementedAt  = now;

    await updateFeedback(id, updates);
    return Response.json({ ok: true });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}
