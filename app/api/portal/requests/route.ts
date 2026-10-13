/**
 * GET/POST /api/portal/requests
 * Portal-session auth. Clients only see their own requests.
 */
import { after } from "next/server";
import { verifySession } from "../../../../lib/portal-session";
import {
  createRequest,
  listRequests,
  toClientView,
  validateNewRequest,
  blobFolderFor,
} from "../../../../lib/client-requests";
import { sendNewRequestNotification } from "../../../../lib/client-request-emails";
import { sendCriticalAlerts } from "../../../../lib/request-alerts";
import { maybeClarifyRequest } from "../../../../lib/request-clarifier";
import { addChangeLogEntry } from "../../../../lib/change-log";
import { rejectIfImpersonatingReadOnly } from "../../../../lib/impersonation";
import { getPortalUser } from "../../../../lib/portal-users";
import { getDirectoryUser } from "../../../../lib/user-directory";
import { getLexClients } from "../../../../lib/lex-config";
import { listSites } from "../../../../lib/site-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

async function resolveClient(email: string) {
  const normalised = email.toLowerCase();
  const lex = getLexClients().find((c) => c.email.teamEmail.toLowerCase() === normalised);
  const portalUser = await getPortalUser(normalised);
  const dirUser = await getDirectoryUser(normalised);
  let site: Awaited<ReturnType<typeof listSites>>[number] | null = null;
  try {
    site = (await listSites()).find((s) => (s.business?.email || "").toLowerCase() === normalised) || null;
  } catch {
    site = null;
  }
  const clientId = lex?.id || site?.id || dirUser?.id || portalUser?.id || "";
  const name = dirUser?.name || portalUser?.name || lex?.firmName || site?.business?.name || email;
  return {
    clientId,
    name,
    email: normalised,
    siteId: site?.id,
    siteName: site?.name || site?.business?.name,
    siteContext: site
      ? `Site ${site.name} (${site.slug}). Domains: ${(site.domains || []).join(", ") || "subpath"}. Niche: ${site.niche || "n/a"}.`
      : lex
        ? `Lex firm ${lex.firmName}.`
        : "",
  };
}

async function requirePortalEmail(req: Request): Promise<string | null> {
  const token = parseCookie(req.headers.get("cookie"), "portal_session");
  if (!token) return null;
  const session = verifySession(token);
  return session?.email?.toLowerCase() || null;
}

export async function GET(req: Request) {
  const email = await requirePortalEmail(req);
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const client = await resolveClient(email);
  if (!client.clientId) return Response.json({ requests: [] });
  try {
    const requests = (await listRequests({ clientId: client.clientId })).map(toClientView);
    return Response.json({
      requests,
      uploadFolder: blobFolderFor(client.clientId),
      siteName: client.siteName || null,
    });
  } catch (err) {
    console.error("[portal/requests] list", err);
    return Response.json({ error: "Could not load your requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const blocked = rejectIfImpersonatingReadOnly(req);
  if (blocked) return blocked;

  const email = await requirePortalEmail(req);
  if (!email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const client = await resolveClient(email);
  if (!client.clientId) {
    return Response.json({ error: "No portal account linked to this email." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const v = validateNewRequest(body, client.clientId);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  try {
    let created = await createRequest({
      clientId: client.clientId,
      clientName: client.name,
      clientEmail: client.email,
      siteId: client.siteId,
      siteName: client.siteName,
      ...v.value,
    });

    after(async () => {
      try {
        await sendNewRequestNotification(created);
        if (created.priority === "critical") {
          await sendCriticalAlerts(created);
        } else {
          created = await maybeClarifyRequest(created, client.siteContext);
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
        console.error("[portal/requests] after", err);
      }
    });

    return Response.json({ request: toClientView(created) }, { status: 201 });
  } catch (err) {
    console.error("[portal/requests] create", err);
    return Response.json({ error: "Could not save your request. Please try again." }, { status: 500 });
  }
}
