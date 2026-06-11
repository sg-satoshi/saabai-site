/**
 * POST /api/audit/engagements/[id]/send-questionnaire
 * Emails the client their tokenised fact-find link via Resend (admin).
 */

import { Resend } from "resend";
import { requireAdmin } from "../../../../../../lib/audit-admin";
import { getEngagement, updateEngagement } from "../../../../../../lib/audit-store";
import { AUDIT_TIER_LABELS } from "../../../../../../lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const TIER_MINUTES: Record<string, string> = {
  essential: "about 10 minutes",
  professional: "about 15 minutes",
  enterprise: "about 20 minutes",
};

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement)
    return Response.json({ error: "Not found" }, { status: 404 });

  const resendKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!resendKey)
    return Response.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.saabai.ai";
  const link = `${baseUrl}/audit/factfind/${engagement.factFindToken}`;
  const minutes = TIER_MINUTES[engagement.tier] ?? "about 10 minutes";

  const resend = new Resend(resendKey);
  const firstName = engagement.contactName.split(" ")[0];

  const { error } = await resend.emails.send({
    from: "Shane at Saabai <hello@saabai.ai>",
    to: engagement.contactEmail,
    replyTo: "hello@saabai.ai",
    subject: `Your AI Audit questionnaire — ${engagement.firmName}`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
        <p>Hi ${firstName},</p>
        <p>Thanks for choosing the <strong>${AUDIT_TIER_LABELS[engagement.tier].split(" (")[0]} AI Audit</strong> for ${engagement.firmName}.</p>
        <p>The first step is a short questionnaire (${minutes}). Your answers shape the discovery session, so the more specific you are — especially about the workflows that eat your week — the sharper the audit.</p>
        <p style="margin: 28px 0;">
          <a href="${link}" style="background: #0e0c2e; color: #ffffff; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start the questionnaire →</a>
        </p>
        <p>Your progress saves as you go, so you can return to it anytime using the same link.</p>
        <p>Once it's in, we'll schedule your discovery session. Any questions, just reply to this email.</p>
        <p>Shane Goldberg<br/>Saabai.ai</p>
      </div>
    `,
  });

  if (error)
    return Response.json({ error: `Email failed: ${error.message}` }, { status: 502 });

  const updated = await updateEngagement(id, {
    factFindSentAt: new Date().toISOString(),
    status: engagement.status === "purchased" ? "questionnaire_sent" : engagement.status,
  });

  return Response.json({ engagement: updated, link });
}
