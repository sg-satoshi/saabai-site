/**
 * GET /api/portal/requests/:id
 * POST /api/portal/requests/:id  { body }  client reply
 */
import { after } from "next/server";
import { verifySession } from "../../../../../lib/portal-session";
import {
  addClientReply,
  getRequest,
  toClientView,
} from "../../../../../lib/client-requests";
import { maybeClarifyRequest } from "../../../../../lib/request-clarifier";
import { rejectIfImpersonatingReadOnly } from "../../../../../lib/impersonation";
import { getPortalUser } from "../../../../../lib/portal-users";
import { getDirectoryUser } from "../../../../../lib/user-directory";
import { getLexClients } from "../../../../../lib/lex-config";
import { listSites } from "../../../../../lib/site-registry";

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

async function clientIdForEmail(email: string): Promise<{ clientId: string; name: string; siteContext: string }> {
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
  return {
    clientId: lex?.id || site?.id || dirUser?.id || portalUser?.id || "",
    name: dirUser?.name || portalUser?.name || lex?.firmName || site?.business?.name || email,
    siteContext: site
      ? `Site ${site.name}. Domains: ${(site.domains || []).join(", ")}. Niche: ${site.niche || "n/a"}.`
      : "",
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = parseCookie(req.headers.get("cookie"), "portal_session");
  const session = token ? verifySession(token) : null;
  if (!session?.email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const { clientId } = await clientIdForEmail(session.email);
  const r = await getRequest(id);
  if (!r || r.clientId !== clientId) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ request: toClientView(r) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rejectIfImpersonatingReadOnly(req);
  if (blocked) return blocked;
  const token = parseCookie(req.headers.get("cookie"), "portal_session");
  const session = token ? verifySession(token) : null;
  if (!session?.email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const { clientId, name, siteContext } = await clientIdForEmail(session.email);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body : typeof body.message === "string" ? body.message : "";
  const result = await addClientReply(id, clientId, text, name);
  if ("error" in result) return Response.json({ error: result.error }, { status: result.code });

  after(async () => {
    try {
      await maybeClarifyRequest(result, siteContext);
    } catch (err) {
      console.error("[portal/requests/reply] clarifier", err);
    }
  });

  return Response.json({ request: toClientView(result) });
}
