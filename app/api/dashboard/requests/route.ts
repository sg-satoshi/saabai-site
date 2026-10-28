/**
 * Client requests API (client-auth, own requests only).
 *   GET  /api/dashboard/requests  → { requests }
 *   POST /api/dashboard/requests  { title, description, priority?, screenshots?: string[] }
 * The clientId always comes from the signed session, never from the request.
 */
import { after } from "next/server";
import { getClientContext } from "../../../../lib/client-context";
import { rejectIfImpersonatingReadOnlyCookies } from "../../../../lib/impersonation";
import { blobFolderFor, createRequest, listRequests, toClientView, validateNewRequest } from "../../../../lib/client-requests";
import { sendNewRequestNotification } from "../../../../lib/client-request-emails";
import { sendCriticalAlerts } from "../../../../lib/request-alerts";
import { maybeClarifyRequest } from "../../../../lib/request-clarifier";
import { addChangeLogEntry } from "../../../../lib/change-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getClientContext();
  if (!ctx) return Response.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const requests = (await listRequests({ clientId: ctx.clientId })).map((r) => ({
      ...toClientView(r),
      adminNote: r.adminNote,
    }));
    return Response.json({ requests, uploadFolder: blobFolderFor(ctx.clientId), siteName: ctx.site?.name ?? null });
  } catch (err) {
    console.error("[dashboard/requests] list", err);
    return Response.json({ error: "Could not load your requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const blocked = await rejectIfImpersonatingReadOnlyCookies();
  if (blocked) return blocked;
  const ctx = await getClientContext();
  if (!ctx) return Response.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const v = validateNewRequest(body, ctx.clientId);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  try {
    const created = await createRequest({
      clientId: ctx.clientId,
      clientName: ctx.name,
      clientEmail: ctx.email,
      ...(ctx.siteId ? { siteId: ctx.siteId } : {}),
      ...(ctx.site?.name ? { siteName: ctx.site.name } : {}),
      ...v.value,
    });
    after(async () => {
      try {
        await sendNewRequestNotification(created);
        if (created.priority === "critical") {
          await sendCriticalAlerts(created);
        } else {
          await maybeClarifyRequest(created, ctx.site?.name ? `Site ${ctx.site.name}` : "");
        }
        await addChangeLogEntry({
          siteId: created.siteId || created.clientId,
          siteName: created.siteName || created.clientName || created.clientId,
          summary: `Request opened: ${created.title} (${created.priority})`,
          source: "request",
          requestId: created.id,
          authorName: created.clientName || created.clientEmail,
        });
      } catch (err) {
        console.error("[dashboard/requests] after", err);
      }
    });
    return Response.json({ request: created }, { status: 201 });
  } catch (err) {
    console.error("[dashboard/requests] create", err);
    return Response.json({ error: "Could not save your request. Please try again." }, { status: 500 });
  }
}
