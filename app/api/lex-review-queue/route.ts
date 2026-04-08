import { Resend } from "resend";
import { listReviews, updateReviewStatus, getReview } from "../../../lib/lex-review-store";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/lex-review-queue?firmId=lex-internal&limit=50
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const firmId = searchParams.get("firmId") ?? "lex-internal";
    const limit  = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const reviews = await listReviews(firmId, limit);
    return Response.json({ reviews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/lex-review-queue — supervisor approves / requests changes
type PatchRequest = {
  id: string;
  status: "approved" | "needs_changes";
  supervisorNotes: string;
  reviewedBy: string;
  notifyEmail?: string; // lawyer's email to notify
};

function approvalEmailHtml(status: "approved" | "needs_changes", reviewedBy: string, notes: string, docName: string): string {
  const approved = status === "approved";
  const colour = approved ? "#22c55e" : "#f97316";
  const heading = approved ? "Review Approved" : "Changes Requested";
  const intro = approved
    ? `Your document review has been approved by ${reviewedBy || "your supervisor"}. The work product is cleared to proceed.`
    : `Your document review has been reviewed by ${reviewedBy || "your supervisor"} and changes have been requested before the work product can proceed.`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d1b2a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #243550;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #243550;">
  <span style="font-size:20px;font-weight:800;color:#C9A84C;">Lex</span>
  <span style="font-size:13px;color:#8fa3c0;margin-left:10px;">Doc Review</span>
</td></tr>
<tr><td style="padding:32px;">
  <div style="display:inline-block;padding:4px 12px;background:${colour}20;border:1px solid ${colour}40;border-radius:20px;font-size:11px;font-weight:700;color:${colour};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;">${heading}</div>
  <h2 style="margin:0 0 12px;font-size:22px;color:#e8edf5;font-weight:800;">${docName || "Document Review"}</h2>
  <p style="margin:0 0 24px;font-size:14px;color:#8fa3c0;line-height:1.6;">${intro}</p>
  ${notes ? `
  <div style="padding:16px;background:#1e3050;border-radius:8px;border-left:4px solid ${colour};margin-bottom:24px;">
    <p style="margin:0 0 6px;font-size:10px;color:#8fa3c0;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Supervisor Notes</p>
    <p style="margin:0;font-size:13px;color:#e8edf5;line-height:1.6;">${notes}</p>
  </div>` : ""}
  <a href="https://www.saabai.ai/lex" style="display:inline-block;padding:12px 24px;background:#C9A84C;color:#0d1b2a;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">Open Lex →</a>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #243550;font-size:11px;color:#4a6080;">
  Sent by Lex · Saabai AI Legal Research · <a href="https://saabai.ai" style="color:#C9A84C;text-decoration:none;">saabai.ai</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body: PatchRequest = await request.json();
    const { id, status, supervisorNotes, reviewedBy, notifyEmail } = body;

    if (!id || !status) {
      return Response.json({ error: "Missing id or status" }, { status: 400 });
    }

    await updateReviewStatus(id, status, supervisorNotes ?? "", reviewedBy ?? "");

    // Email the lawyer if an address was provided
    if (notifyEmail) {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        try {
          const review = await getReview(id);
          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: "Lex at Saabai <hello@saabai.ai>",
            to: notifyEmail,
            subject: status === "approved"
              ? `Review approved: ${review?.documentName || review?.documentType || "Document"}`
              : `Changes requested: ${review?.documentName || review?.documentType || "Document"}`,
            html: approvalEmailHtml(status, reviewedBy, supervisorNotes, review?.documentName || review?.documentType || ""),
          });
        } catch { /* non-fatal */ }
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
