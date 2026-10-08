/**
 * POST /api/dashboard/requests/upload
 * Issues short-lived Vercel Blob client-upload tokens for request screenshots.
 * Files go straight from the browser to Blob (avoids the 4.5 MB function body
 * limit). Each token is bound to a path inside this client's own folder and
 * limited to images of at most 5 MB.
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getClientSession } from "../../../../../lib/client-session";
import { blobFolderFor, MAX_SCREENSHOT_BYTES, SCREENSHOT_TYPES } from "../../../../../lib/client-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Screenshot uploads aren't available right now." }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  // Only token generation is supported (no completion webhook is registered).
  if (body?.type !== "blob.generate-client-token") {
    return Response.json({ error: "Unsupported" }, { status: 400 });
  }

  const folder = `${blobFolderFor(session.clientId)}/`;
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
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    console.error("[dashboard/requests/upload]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Upload not allowed" }, { status: 400 });
  }
}
