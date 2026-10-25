/**
 * GET/PATCH /api/admin/requests/:id
 * PATCH: status, assignee, autoHandle/discussWithShane, internal note, reply to client
 */
import { actorLabel } from "../../../../../lib/auth-acl";
import { requireAdminSession } from "../../../../../lib/admin-guard";
import {
  addTimelineEntry,
  getRequest,
  updateRequest,
  type RequestAssignee,
} from "../../../../../lib/client-requests";
import { sendStatusUpdate } from "../../../../../lib/client-request-emails";
import { addChangeLogEntry } from "../../../../../lib/change-log";
import { EMAIL_BRAND, escapeHtml, renderBrandedEmail, sendBrandedEmail } from "../../../../../lib/email/branded-layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ request });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Client-visible reply (dedicated action)
    if (typeof body.reply === "string" && body.reply.trim() && body.status === undefined && body.discussWithShane === undefined) {
      const existing = await getRequest(id);
      if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
      const next = await addTimelineEntry(id, {
        kind: "comment",
        authorKind: "admin",
        authorName: typeof body.authorName === "string" ? body.authorName : "Shane",
        body: body.reply.trim(),
      });
      if (!next) return Response.json({ error: "Not found" }, { status: 404 });
      if (next.clientEmail) {
        const email = renderBrandedEmail({
          subject: `Update on your request: ${next.title}`,
          preheader: "New reply from Saabai",
          eyebrow: "Request update",
          title: "New reply on your request",
          bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">Hi ${escapeHtml((next.clientName || "").split(" ")[0] || "there")},</p>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">${escapeHtml(body.reply.trim()).replace(/\n/g, "<br>")}</p>`,
          cta: { href: EMAIL_BRAND.portalUrl, label: "Open your portal" },
          textBody: [String(body.reply.trim()), "", EMAIL_BRAND.portalUrl],
        });
        await sendBrandedEmail({ to: next.clientEmail, email, from: EMAIL_BRAND.fromShane });
      }
      return Response.json({ request: next, emailed: true });
    }

    const hasFieldUpdate =
      body.status !== undefined ||
      body.adminNote !== undefined ||
      body.assignee !== undefined ||
      body.autoHandle !== undefined ||
      body.discussWithShane !== undefined ||
      body.agreedChange !== undefined;

    let request = await getRequest(id);
    if (!request) return Response.json({ error: "Not found" }, { status: 404 });
    let statusChanged = false;

    if (hasFieldUpdate) {
      const result = await updateRequest(id, {
        status: body.status,
        adminNote: body.adminNote,
        assignee: body.assignee as RequestAssignee | undefined,
        autoHandle: body.autoHandle,
        discussWithShane: body.discussWithShane,
        agreedChange: body.agreedChange,
      });
      if ("error" in result) return Response.json({ error: result.error }, { status: result.code });
      request = result.request;
      statusChanged = result.statusChanged;
    }

    if (typeof body.internalNote === "string" && body.internalNote.trim()) {
      const next = await addTimelineEntry(id, {
        kind: "internal_note",
        authorKind: "admin",
        authorName: await actorLabel(),
        body: body.internalNote.trim(),
        internal: true,
      });
      if (!next) return Response.json({ error: "Not found" }, { status: 404 });
      request = next;
    }

    let emailed = false;
    if (statusChanged && body.notifyClient !== false) {
      emailed = await sendStatusUpdate(request);
      await addChangeLogEntry({
        siteId: request.siteId || request.clientId,
        siteName: request.siteName || request.clientName || request.clientId,
        summary: `Request “${request.title}” → ${request.status}`,
        source: "request",
        requestId: request.id,
        authorName: await actorLabel(),
      });
    }
    return Response.json({ request, statusChanged, emailed });
  } catch (err) {
    console.error("[admin/requests] update", err);
    return Response.json({ error: "Could not update the request" }, { status: 500 });
  }
}
