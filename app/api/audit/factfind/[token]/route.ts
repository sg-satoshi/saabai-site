/**
 * Public, token-gated fact-find endpoints (no login required).
 *
 * GET  /api/audit/factfind/[token] — questions for the engagement's tier +
 *      existing answers (resume support)
 * POST /api/audit/factfind/[token] — save responses; { complete: true } marks
 *      the fact-find finished and notifies Shane via Resend
 */

import { Resend } from "resend";
import {
  getEngagementByToken,
  saveResponses,
} from "../../../../../lib/audit-store";
import {
  questionsForTier,
  sectionsForTier,
} from "../../../../../lib/audit-factfind";
import { FactFindResponse, FactFindValue } from "../../../../../lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const engagement = await getEngagementByToken(token);
  if (!engagement)
    return Response.json({ error: "Invalid or expired link" }, { status: 404 });

  // Strip interview prompts — they're internal
  const questions = questionsForTier(engagement.tier, engagement.firmType).map(
    (q) => {
      const { interviewPrompt, ...publicQ } = q;
      void interviewPrompt;
      return publicQ;
    }
  );

  return Response.json({
    firmName: engagement.firmName,
    contactName: engagement.contactName,
    tier: engagement.tier,
    completed: Boolean(engagement.factFindCompletedAt),
    sections: sectionsForTier(engagement.tier),
    questions,
    answers: Object.fromEntries(
      Object.entries(engagement.responses).map(([qid, r]) => [qid, r.value])
    ),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const engagement = await getEngagementByToken(token);
  if (!engagement)
    return Response.json({ error: "Invalid or expired link" }, { status: 404 });

  let body: { answers?: Record<string, FactFindValue>; complete?: boolean };
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
  const updated = await saveResponses(engagement.id, responses, {
    markComplete: complete,
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
      try {
        await new Resend(resendKey).emails.send({
          from: "Saabai Audits <hello@saabai.ai>",
          to: "hello@saabai.ai",
          subject: `✅ Fact-find complete: ${engagement.firmName} (${engagement.tier})`,
          html: `
            <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px;">
              <p><strong>${engagement.firmName}</strong> has completed their AI Audit fact-find.</p>
              <p>Tier: ${engagement.tier} · Contact: ${engagement.contactName} (${engagement.contactEmail}) · ${answered} answers</p>
              <p><a href="${baseUrl}/saabai-admin/audits/${engagement.id}">Open engagement in admin →</a></p>
            </div>
          `,
        });
      } catch {
        // Notification failure must not block the client's submission
      }
    }
  }

  return Response.json({ saved: responses.length, complete });
}
