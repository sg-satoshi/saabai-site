/**
 * Admin Lex feedback inbox. GET ?status&type&firm&tag -> { items, byFirm }; ?format=csv -> export; ?shot=<id> -> screenshot.
 * POST {id, status?, tags?, adminNote?} -> updated item. Behind ADMIN_API in proxy.ts; checked again here.
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "@/lib/auth";
import { countsByFirm, feedbackCsv, getScreenshot, listFeedback, updateFeedback } from "@/lib/lex-feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return !!session && (await isAdminSession(session.clientId));
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const q = new URL(req.url).searchParams;
  try {
    const shot = q.get("shot");
    if (shot) {
      const d = await getScreenshot(shot);
      if (!d) return Response.json({ error: "Not found" }, { status: 404 });
      const m = d.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
      if (!m) return Response.json({ error: "Not found" }, { status: 404 });
      return new Response(Buffer.from(m[2], "base64"), { headers: { "content-type": m[1], "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
    }
    const filter = { status: q.get("status") || undefined, type: q.get("type") || undefined, firm: q.get("firm") || undefined, tag: q.get("tag") || undefined };
    const items = await listFeedback(filter);
    if (q.get("format") === "csv") {
      return new Response(feedbackCsv(items), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="lex-feedback-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
    }
    return Response.json({ items, byFirm: countsByFirm(await listFeedback({})) });
  } catch (err) {
    console.error("[admin lex-feedback]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not load feedback" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown; tags?: unknown; adminNote?: unknown } | null;
  if (!body || typeof body.id !== "string") return Response.json({ error: "id required" }, { status: 400 });
  try {
    const it = await updateFeedback(body.id, { status: body.status, tags: body.tags, adminNote: body.adminNote });
    return it ? Response.json({ item: it }) : Response.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    if (err instanceof Error && err.message === "bad status") return Response.json({ error: "Unknown status" }, { status: 400 });
    console.error("[admin lex-feedback]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not update" }, { status: 500 });
  }
}
