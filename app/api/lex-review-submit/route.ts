import { Resend } from "resend";
import { saveReview } from "../../../lib/lex-review-store";
import type { ReviewReport } from "../lex-review/route";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

export const runtime = "nodejs";
export const maxDuration = 30;

type SubmitRequest = {
  firmId: string;
  submittedBy: string;
  matterNo: string;
  clientName: string;
  documentName: string;
  report: ReviewReport;
  supervisorEmail?: string;
};

function riskColour(level: string) {
  return level === "critical" ? "#ef4444"
    : level === "high" ? "#f97316"
    : level === "medium" ? "#eab308"
    : "#22c55e";
}

function emailShell(subject: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0d1b2a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #243550;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #243550;">
  <span style="font-size:20px;font-weight:800;color:#C9A84C;letter-spacing:0.5px;">Lex</span>
  <span style="font-size:13px;color:#8fa3c0;margin-left:10px;">Doc Review</span>
</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #243550;font-size:11px;color:#4a6080;">
  Sent by Lex · Saabai AI Legal Research · <a href="https://saabai.ai" style="color:#C9A84C;text-decoration:none;">saabai.ai</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function supervisorEmail(req: SubmitRequest): string {
  const { report, submittedBy, matterNo, clientName, documentName } = req;
  const risk = report.riskLevel;
  const colour = riskColour(risk);
  const critical = report.findings.filter(f => f.severity === "critical").length;
  const moderate = report.findings.filter(f => f.severity === "moderate").length;

  const findingsHtml = report.findings.slice(0, 5).map(f => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #243550;">
        <span style="font-size:10px;font-weight:700;color:${f.severity === "critical" ? "#ef4444" : f.severity === "moderate" ? "#f97316" : "#eab308"};text-transform:uppercase;letter-spacing:0.5px;">${esc(f.severity)}</span>
        <p style="margin:4px 0 0;font-size:13px;color:#e8edf5;font-weight:600;">${esc(f.title)}</p>
        <p style="margin:3px 0 0;font-size:12px;color:#8fa3c0;">${esc(f.issue)}</p>
      </td>
    </tr>`).join("");

  const body = `
    <p style="margin:0 0 6px;font-size:13px;color:#8fa3c0;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">New Review Submitted</p>
    <h2 style="margin:0 0 24px;font-size:22px;color:#e8edf5;font-weight:800;">${esc(documentName || report.documentType)}</h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:14px;background:#1e3050;border-radius:8px;width:50%;vertical-align:top;">
          <p style="margin:0;font-size:10px;color:#8fa3c0;text-transform:uppercase;letter-spacing:0.5px;">Submitted By</p>
          <p style="margin:4px 0 0;font-size:14px;color:#e8edf5;font-weight:600;">${esc(submittedBy) || "—"}</p>
        </td>
        <td style="width:12px;"></td>
        <td style="padding:14px;background:#1e3050;border-radius:8px;width:50%;vertical-align:top;">
          <p style="margin:0;font-size:10px;color:#8fa3c0;text-transform:uppercase;letter-spacing:0.5px;">Matter</p>
          <p style="margin:4px 0 0;font-size:14px;color:#e8edf5;font-weight:600;">${esc(matterNo) || "—"} ${clientName ? `· ${esc(clientName)}` : ""}</p>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:24px;padding:16px;background:#1e3050;border-radius:8px;border-left:4px solid ${colour};">
      <p style="margin:0;font-size:10px;color:#8fa3c0;text-transform:uppercase;letter-spacing:0.5px;">Risk Assessment</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:${colour};text-transform:uppercase;">${esc(risk)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#8fa3c0;">Score ${report.overallScore}/100 · ${critical} critical · ${moderate} moderate finding${moderate !== 1 ? "s" : ""}</p>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#e8edf5;font-weight:600;">Summary</p>
    <p style="margin:0 0 24px;font-size:13px;color:#8fa3c0;line-height:1.6;">${esc(report.summary)}</p>

    ${report.findings.length > 0 ? `
    <p style="margin:0 0 8px;font-size:13px;color:#e8edf5;font-weight:600;">Key Findings</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #243550;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      ${findingsHtml}
    </table>` : ""}

    <a href="https://www.saabai.ai/client-portal?tab=review-queue" style="display:inline-block;padding:12px 24px;background:#C9A84C;color:#0d1b2a;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">Review &amp; Sign Off →</a>
  `;
  return emailShell(`New Doc Review: ${documentName || report.documentType} (${risk.toUpperCase()})`, body);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: SubmitRequest = await request.json();
    const { firmId, submittedBy, matterNo, clientName, documentName, report, supervisorEmail: supEmail } = body;

    if (!firmId || !report) {
      return Response.json({ error: "Missing firmId or report" }, { status: 400 });
    }

    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await saveReview({
      id,
      firmId,
      submittedBy: submittedBy || "",
      matterNo: matterNo || "",
      clientName: clientName || "",
      documentName: documentName || "",
      submittedAt: Date.now(),
      reportJson: JSON.stringify(report),
      riskLevel: report.riskLevel,
      overallScore: report.overallScore,
      documentType: report.documentType,
      direction: report.direction,
      jurisdiction: report.jurisdiction,
      status: "pending",
      supervisorNotes: "",
      reviewedBy: "",
    });

    // Send email notification to supervisor
    const notifyEmail = supEmail || process.env.SAABAI_NOTIFY_EMAIL || "hello@saabai.ai";
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && notifyEmail) {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: "Lex at Saabai <hello@saabai.ai>",
          to: notifyEmail,
          subject: `New Doc Review: ${documentName || report.documentType} — ${report.riskLevel.toUpperCase()} risk`,
          html: supervisorEmail(body),
        });
      } catch { /* non-fatal */ }
    }

    return Response.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
