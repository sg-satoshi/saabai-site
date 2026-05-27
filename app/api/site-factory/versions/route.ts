import { NextRequest } from "next/server";
import { listVersions } from "../../../../lib/site-versions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
  const versions = await listVersions(slug);
  return Response.json({ versions });
}
