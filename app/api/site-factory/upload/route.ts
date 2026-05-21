import { NextRequest } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const slug = formData.get("slug") as string | null;

    if (!file || !(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
    if (!file.type.startsWith("image/")) return Response.json({ error: "Images only" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Max 10MB" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const name = `sites/${slug || "shared"}/uploads/${Date.now()}.${ext}`;
    const blob = await put(name, file, { access: "public", addRandomSuffix: false, allowOverwrite: true });

    return Response.json({ ok: true, url: blob.url });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
