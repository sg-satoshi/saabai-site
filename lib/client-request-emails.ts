/**
 * Emails for client requests (Resend). Failures are logged, never thrown, so
 * a mail problem can't block saving a request.
 */
import { Resend } from "resend";
import { PRIORITY_LABELS, STATUS_LABELS, type ClientRequest } from "./client-requests";

const SITE = "https://www.saabai.ai";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, "<br>");
}

function shell(heading: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td style="background:#0b092e;padding:26px 36px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#62c5d1;">Saabai</p>
        <h1 style="margin:10px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${heading}</h1>
      </td></tr>
      <tr><td style="padding:30px 36px;font-size:14px;color:#374151;line-height:1.6;">${inner}</td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid rgba(0,0,0,0.06);">
        <p style="margin:0;font-size:11px;color:#9CA3AF;">Saabai · <a href="${SITE}" style="color:#0f766e;text-decoration:none;">www.saabai.ai</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr><td style="border-radius:999px;background:#0f766e;">
    <a href="${href}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${label}</a>
  </td></tr></table>`;
}

export function buildNewRequestEmail(r: ClientRequest): { subject: string; html: string } {
  const who = r.clientName || r.clientEmail || r.clientId;
  const shots = r.screenshots.length
    ? `<p style="margin:16px 0 4px;font-weight:700;color:#111827;">Screenshots</p>` +
      r.screenshots.map((u, i) => `<a href="${escapeHtml(u)}" style="color:#0f766e;">Screenshot ${i + 1}</a>`).join(" · ")
    : "";
  const inner = `
    <p style="margin:0 0 14px;">${escapeHtml(who)}${r.siteName ? ` (${escapeHtml(r.siteName)})` : ""} sent a new request.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f6f2;border-radius:12px;border:1px solid rgba(0,0,0,0.06);"><tr><td style="padding:18px 20px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(r.title)}</p>
      <p style="margin:6px 0 12px;font-size:12px;color:#6b7280;">Priority: <strong>${PRIORITY_LABELS[r.priority]}</strong> · From: ${escapeHtml(r.clientEmail)}</p>
      <p style="margin:0;color:#374151;">${nl2br(r.description)}</p>
      ${shots}
    </td></tr></table>
    ${button(`${SITE}/saabai-admin/requests`, "Open requests")}`;
  return { subject: `New request from ${who}: ${r.title}`, html: shell("New client request", inner) };
}

export function buildStatusEmail(r: ClientRequest): { subject: string; html: string } {
  const first = escapeHtml((r.clientName || "").split(" ")[0] || "there");
  const status = STATUS_LABELS[r.status];
  const lead =
    r.status === "done"
      ? `Good news, your request <strong>“${escapeHtml(r.title)}”</strong> is now done.`
      : r.status === "in_progress"
        ? `Just a quick note to let you know I've started work on your request <strong>“${escapeHtml(r.title)}”</strong>.`
        : `Your request <strong>“${escapeHtml(r.title)}”</strong> is now marked as ${escapeHtml(status.toLowerCase())}.`;
  const note = r.adminNote
    ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin-top:16px;background:#f8f6f2;border-radius:12px;border:1px solid rgba(0,0,0,0.06);"><tr><td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#0f766e;">Note</p>
        <p style="margin:0;color:#374151;">${nl2br(r.adminNote)}</p>
      </td></tr></table>`
    : "";
  const inner = `
    <p style="margin:0 0 14px;color:#111827;font-size:15px;">Hi ${first},</p>
    <p style="margin:0;">${lead}</p>
    ${note}
    ${button(`${SITE}/dashboard/requests`, "View your requests")}
    <p style="margin:18px 0 0;">If you have any questions, just reply to this email. Thanks so much!</p>
    <p style="margin:12px 0 0;">Kind regards,<br>Shane</p>`;
  return { subject: `Update on your request: ${r.title}`, html: shell(`Request ${escapeHtml(status.toLowerCase())}`, inner) };
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.log(`[client-requests] (dev, no RESEND_API_KEY) email to ${to}: ${subject}`);
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({
      from: "Shane at Saabai <hello@saabai.ai>",
      replyTo: "hello@saabai.ai",
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[client-requests] email failed", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[client-requests] email failed", err instanceof Error ? err.message : err);
    return false;
  }
}

export function notifyEmail(): string {
  return process.env.REQUESTS_NOTIFY_EMAIL || "hello@saabai.ai";
}

export async function sendNewRequestNotification(r: ClientRequest): Promise<boolean> {
  const { subject, html } = buildNewRequestEmail(r);
  return send(notifyEmail(), subject, html);
}

export async function sendStatusUpdate(r: ClientRequest): Promise<boolean> {
  if (!r.clientEmail) return false;
  const { subject, html } = buildStatusEmail(r);
  return send(r.clientEmail, subject, html);
}
