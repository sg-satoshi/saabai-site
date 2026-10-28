/**
 * Emails for client requests (Resend). Failures are logged, never thrown, so
 * a mail problem can't block saving a request.
 */
import { PRIORITY_LABELS, STATUS_LABELS, type ClientRequest } from "./client-requests";
import { EMAIL_BRAND, escapeHtml, renderBrandedEmail, sendBrandedEmail } from "./email/branded-layout";
import { adminRequestEmail } from "./notify-routing";

const SITE = "https://www.saabai.ai";

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, "<br>");
}

export function buildNewRequestEmail(r: ClientRequest) {
  const who = r.clientName || r.clientEmail || r.clientId;
  const shots = r.screenshots.length
    ? `<p style="margin:16px 0 4px;font-weight:700;color:#13152a;">Screenshots</p>` +
      r.screenshots
        .map((u, i) => `<a href="${escapeHtml(u)}" style="color:#0e7482;">Screenshot ${i + 1}</a>`)
        .join(" · ")
    : "";
  return renderBrandedEmail({
    subject: `New request from ${who}: ${r.title}`,
    preheader: `${PRIORITY_LABELS[r.priority]} priority request`,
    eyebrow: "Client request",
    title: "New client request",
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">${escapeHtml(who)}${r.siteName ? ` (${escapeHtml(r.siteName)})` : ""} sent a new request.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f9;border-radius:12px;border:1px solid #dfe2ea;"><tr><td style="padding:18px 20px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#13152a;">${escapeHtml(r.title)}</p>
        <p style="margin:6px 0 12px;font-size:12px;color:#5f6580;">Priority: <strong>${PRIORITY_LABELS[r.priority]}</strong> · From: ${escapeHtml(r.clientEmail)}</p>
        <p style="margin:0;color:#13152a;font-size:14px;line-height:1.6;">${nl2br(r.description)}</p>
        ${shots}
      </td></tr></table>`,
    cta: { href: `${SITE}/saabai-admin/requests`, label: "Open requests" },
    textBody: [
      `${who} sent a new request.`,
      `Title: ${r.title}`,
      `Priority: ${PRIORITY_LABELS[r.priority]}`,
      r.description,
    ],
  });
}

export function buildStatusEmail(r: ClientRequest) {
  const first = escapeHtml((r.clientName || "").split(" ")[0] || "there");
  const status = STATUS_LABELS[r.status] || r.status || "updated";
  const lead =
    r.status === "done"
      ? `Good news, your request <strong>“${escapeHtml(r.title)}”</strong> is done.`
      : r.status === "in_progress"
        ? `Quick update: work has started on <strong>“${escapeHtml(r.title)}”</strong>.`
        : r.status === "awaiting_client"
          ? `We need a quick detail from you on <strong>“${escapeHtml(r.title)}”</strong>.`
          : `Your request <strong>“${escapeHtml(r.title)}”</strong> is now marked as ${escapeHtml((status || r.status).toLowerCase())}.`;
  const note = r.adminNote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;background:#f4f5f9;border-radius:12px;border:1px solid #dfe2ea;"><tr><td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0e7482;">Note</p>
        <p style="margin:0;color:#13152a;">${nl2br(r.adminNote)}</p>
      </td></tr></table>`
    : "";
  return renderBrandedEmail({
    subject: `Update on your request: ${r.title}`,
    preheader: `Status: ${status}`,
    eyebrow: "Request update",
    title: `Request ${status.toLowerCase()}`,
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">Hi ${first},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">${lead}</p>
      ${note}
      <p style="margin:18px 0 0;font-size:15px;line-height:1.65;color:#13152a;">If you have any questions, just reply to this email. Thanks so much!</p>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.65;color:#13152a;">Kind regards,<br>Shane</p>`,
    cta: { href: `${SITE}/client-portal`, label: "View your requests" },
    textBody: [
      `Hi ${(r.clientName || "").split(" ")[0] || "there"},`,
      "",
      `Status: ${status}. Title: ${r.title}`,
      r.adminNote || "",
      "",
      "View: https://www.saabai.ai/client-portal",
    ],
  });
}

export function notifyEmail(): string {
  return adminRequestEmail(process.env, "new");
}

export async function sendNewRequestNotification(r: ClientRequest): Promise<boolean> {
  return sendBrandedEmail({
    to: notifyEmail(),
    email: buildNewRequestEmail(r),
    from: EMAIL_BRAND.fromShane,
    replyTo: EMAIL_BRAND.supportEmail,
  });
}

export async function sendStatusUpdate(r: ClientRequest): Promise<boolean> {
  if (!r.clientEmail) return false;
  return sendBrandedEmail({
    to: r.clientEmail,
    email: buildStatusEmail(r),
    from: EMAIL_BRAND.fromShane,
    replyTo: EMAIL_BRAND.supportEmail,
  });
}
