import { put } from "@vercel/blob";

export const runtime = "edge";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  // Auth (same conditional pattern as /api/linkedin/post)
  const authHeader = req.headers.get("authorization");
  const adminSecret = process.env.SAABAI_ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided (field 'file' required)" }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: "Unsupported file type (jpg, png, webp only)" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "BLOB_READ_WRITE_TOKEN not configured on the server" }, { status: 500 });
  }

  try {
    const blob = await put(file.name || "upload", file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return Response.json({ url: blob.url });
  } catch (err) {
    console.error("[upload-image]", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
