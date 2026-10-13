import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { verifySession } from "../../../../../lib/portal-session";
import { blobFolderFor, MAX_SCREENSHOT_BYTES, SCREENSHOT_TYPES } from "../../../../../lib/client-requests";
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

async function clientIdForEmail(email: string): Promise<string> {
  const normalised = email.toLowerCase();
  const lex = getLexClients().find((c) => c.email.teamEmail.toLowerCase() === normalised);
  const portalUser = await getPortalUser(normalised);
  const dirUser = await getDirectoryUser(normalised);
  let siteId = "";
  try {
    const site = (await listSites()).find((s) => (s.business?.email || "").toLowerCase() === normalised);
    siteId = site?.id || "";
  } catch {
    /* ignore */
  }
  return lex?.id || siteId || dirUser?.id || portalUser?.id || "";
}

export async function POST(req: Request) {
  const blocked = rejectIfImpersonatingReadOnly(req);
  if (blocked) return blocked;
  const token = parseCookie(req.headers.get("cookie"), "portal_session");
  const session = token ? verifySession(token) : null;
  if (!session?.email) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const clientId = await clientIdForEmail(session.email);
  if (!clientId) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Screenshot uploads aren't available right now." }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body?.type !== "blob.generate-client-token") {
    return Response.json({ error: "Unsupported" }, { status: 400 });
  }

  const folder = `${blobFolderFor(clientId)}/`;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(folder) || pathname.includes("..") || pathname.length > 200) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: SCREENSHOT_TYPES,
          maximumSizeInBytes: MAX_SCREENSHOT_BYTES,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    console.error("[portal/requests/upload]", err);
    return Response.json({ error: "Could not start upload" }, { status: 500 });
  }
}
