/**
 * /api/lex-upload-token
 * Issues short-lived Vercel Blob client-upload tokens for large Lex documents (over 4 MB), so they can
 * skip Vercel's 4.5 MB request body limit. Uploads are PRIVATE blobs. Signed-in Lex users only
 * (checked here, not just by the proxy). Each token is bound to the caller's own HMAC-named temp
 * folder, PDF/DOCX/TXT, 25 MB max, 10 minutes. The reading route deletes every blob it is sent, and
 * /api/cron/lex-tmp-sweep deletes anything left after 30 minutes (within about 45 minutes). 404 unless LEX_BLOB_UPLOADS=1.
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { resolveReviewActor } from "../../../lib/lex-review-access";
import { LEX_MAX_FILE_BYTES, LEX_UPLOAD_TYPES, lexBlobFolder, lexBlobUploadsEnabled } from "../../../lib/lex-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

async function folderFor(req: Request): Promise<string | null> {
  const actor = await resolveReviewActor(req);
  if (!actor) return null;
  return lexBlobFolder(actor.kind === "firm" ? actor.email : `admin:${actor.id}`);
}

export async function POST(req: Request) {
  if (!lexBlobUploadsEnabled()) return notFound();
  const folder = await folderFor(req);
  if (!folder) return Response.json({ error: "Not authenticated" }, { status: 401 });

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body?.type !== "blob.generate-client-token") return Response.json({ error: "Unsupported" }, { status: 400 });

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(folder) || pathname.includes("..") || pathname.length > 200) throw new Error("Invalid upload path");
        return { allowedContentTypes: LEX_UPLOAD_TYPES, maximumSizeInBytes: LEX_MAX_FILE_BYTES, addRandomSuffix: true, validUntil: Date.now() + 10 * 60 * 1000 };
      },
    });
    return Response.json(result);
  } catch (err) {
    console.error("[lex-upload-token]", err instanceof Error ? err.message : "error");
    return Response.json({ error: "Upload not allowed" }, { status: 400 });
  }
}

/** The caller's own temp folder, so the browser can name its upload. 404 while the flag is off. */
export async function GET(req: Request) {
  if (!lexBlobUploadsEnabled()) return notFound();
  const folder = await folderFor(req);
  if (!folder) return Response.json({ error: "Not authenticated" }, { status: 401 });
  return Response.json({ enabled: true, folder });
}
