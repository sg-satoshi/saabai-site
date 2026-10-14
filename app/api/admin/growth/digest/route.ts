import { requireAdminSession } from "@/lib/admin-guard";
import { buildDigest, renderDigest } from "@/lib/growth/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin preview of this week's digest. Never sends. */
export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { html } = renderDigest(await buildDigest());
  return new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digest preview</title>${html}`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
