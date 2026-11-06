/**
 * Public, token-gated fact-find endpoints (no login required).
 *
 * GET  /api/audit/factfind/[token]: questions for the engagement's tier +
 *      existing answers (resume support)
 * POST /api/audit/factfind/[token]: save responses; { complete: true } marks
 *      the fact-find finished and notifies Shane via Resend. On completion the
 *      three required "Start here" answers must be present, and the optional
 *      { quoteConsent } flag is stored (absent or anything but true = no).
 */

import { Resend } from "resend";
import {
  getEngagementByToken,
  saveResponses,
} from "../../../../../lib/audit-store";
import {
  missingStartAnswers,
  questionsForTier,
  sectionsForTier,
  START_QUESTION_IDS,
  toPublicQuestion,
  toPublicSection,
  toPublicValue,
} from "../../../../../lib/audit-factfind";
import {
  AuditEngagement,
  FactFindResponse,
  FactFindValue,
} from "../../../../../lib/audit-types";
import { isDemoFactFindToken, demoEngagement } from "../../../../../lib/audit-factfind-demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadEngagement(token: string): Promise<{ engagement: AuditEngagement | null; demo: boolean }> {
  if (isDemoFactFindToken(token)) return { engagement: demoEngagement(token), demo: true };
  return { engagement: await getEngagementByToken(token), demo: false };
}

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const { engagement } = await loadEngagement(token);
  if (!engagement)
    return Response.json({ error: "Invalid or expired link" }, { status: 404 });

  // Interview prompts are internal; public copy never shows an em dash.
  const questions = questionsForTier(engagement.tier, engagement.firmType).map(toPublicQuestion);

  return Response.json({
    firmName: engagement.firmName,
    contactName: engagement.contactName,
    tier: engagement.tier,
    completed: Boolean(engagement.factFindCompletedAt),
    sections: sectionsForTier(engagement.tier).map(toPublicSection),
    questions,
    answers: Object.fromEntries(
      Object.entries(engagement.responses).map(([qid, r]) => [qid, toPublicValue(r.value)])
    ),
    quoteConsent: engagement.quoteConsent === true,
  });
}

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const { engagement, demo } = await loadEngagement(token);
  if (!engagement)
    return Response.json({ error: "Invalid or expired link" }, { status: 404 });

  // Once a client has submitted through the portal the answers are locked.
  if (engagement.portal?.submittedAt)
    return Response.json({ error: "This fact-find has been submitted and is locked. Reply to our email if you need a change." }, { status: 423 });

  let body: {
    answers?: Record<string, FactFindValue>;
    complete?: boolean;
    quoteConsent?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validIds = new Set(
    questionsForTier(engagement.tier, engagement.firmType).map((q) => q.id)
  );

  const responses: FactFindResponse[] = Object.entries(body.answers ?? {})
    .filter(([qid]) => validIds.has(qid))
    .map(([questionId, value]) => ({
      questionId,
      value,
      answeredAt: new Date().toISOString(),
      mode: "client" as const,
    }));

  const complete = body.complete === true;

  // The three "Start here" answers are required before the form can be sent.
  if (complete) {
    const values: Record<string, unknown> = Object.fromEntries(
      Object.entries(engagement.responses).map(([qid, r]) => [qid, r.value])
    );
    for (const r of responses) values[r.questionId] = r.value;
    const missing = missingStartAnswers(values);
    if (missing.length > 0)
      return Response.json(
        { error: "Please answer the three Start here questions first.", missing },
        { status: 400 }
      );
  }

  // Consent is only ever recorded as yes when explicitly ticked.
  const quoteConsent = body.quoteConsent === true;

  // Preview-only demo link: validate the same way, store nothing, email no one.
  if (demo) return Response.json({ saved: responses.length, complete, quoteConsent, demo: true });

  const updated = await saveResponses(engagement.id, responses, {
    markComplete: complete,
    extra: complete
      ? { quoteConsent, quoteConsentAt: quoteConsent ? new Date().toISOString() : undefined }
      : undefined,
  });
  if (!updated)
    return Response.json({ error: "Storage unavailable" }, { status: 503 });

  // Notify Shane on completion
  if (complete && !engagement.factFindCompletedAt) {
    const resendKey = (process.env.RESEND_API_KEY ?? "").trim();
    if (resendKey) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.saabai.ai";
      const answered = Object.keys(updated.responses).length;
      const frustration = updated.responses[START_QUESTION_IDS.frustration]?.value;
      try {
        await new Resend(resendKey).emails.send({
          from: "Saabai Audits <hello@saabai.ai>",
          to: "hello@saabai.ai",
          subject: `✅ Fact-find complete: ${engagement.firmName} (${engagement.tier})`,
          html: `
            <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px;">
              <p><strong>${escapeHtml(engagement.firmName)}</strong> has completed their Blueprint fact-find.</p>
              <p>Tier: ${engagement.tier} · Contact: ${escapeHtml(engagement.contactName)} (${escapeHtml(engagement.contactEmail)}) · ${answered} answers</p>
              ${typeof frustration === "string" && frustration.trim() ? `<p><strong>What's frustrating them most:</strong><br>${escapeHtml(frustration.trim())}</p>` : ""}
              <p>Anonymous quote consent: <strong>${quoteConsent ? "Yes" : "No"}</strong></p>
              <p><a href="${baseUrl}/saabai-admin/audits/${engagement.id}">Open engagement in admin →</a></p>
            </div>
          `,
        });
      } catch {
        // Notification failure must not block the client's submission
      }
    }
  }

  return Response.json({ saved: responses.length, complete, quoteConsent });
}
