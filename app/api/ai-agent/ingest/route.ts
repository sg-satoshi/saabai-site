import { serviceClient } from "../../../../lib/agent-supabase";
import { getTenantBySlug } from "../../../../lib/agent-retrieval";
import { ingestUrl } from "../../../../lib/agent-ingest";

export const runtime = "nodejs";
export const maxDuration = 60; // fetch + embed a page can be slow

/** ADMIN-gated: list knowledge sources for a tenant. GET /api/ai-agent/ingest?slug=<slug> */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });
    const { data, error } = await serviceClient()
      .from("knowledge_sources")
      .select("id, url, title, type, status, chunk_count, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ sources: data ?? [] });
  } catch (e) {
    console.error("ingest GET:", e);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * ADMIN-gated (proxy ADMIN_API) — Train action: ingest a source into a tenant's
 * knowledge base. POST /api/ai-agent/ingest { slug, url, title?, docType? }
 *
 * The raw file/page is NOT stored — text is extracted, chunked, embedded, and
 * only the chunks are written (files-parsed-not-stored, per owner decision).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug: string = body.slug;
    const url: string = body.url;
    const title: string = body.title ?? null;
    const docType: string = body.docType ?? "site";

    if (!slug || !url) return Response.json({ error: "slug + url required" }, { status: 400 });
    // allow http(s) only
    if (!/^https?:\/\//i.test(url)) return Response.json({ error: "url must be http(s)" }, { status: 400 });

    const tenant = await getTenantBySlug(slug);
    if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });

    const db = serviceClient();
    const sourceId = `src_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const { error: serr } = await db.from("knowledge_sources").insert({
      id: sourceId,
      tenant_id: tenant.id,
      type: docType === "doc" ? "doc" : "site",
      url,
      title,
      status: "indexing",
      chunk_count: 0,
    });
    if (serr) return Response.json({ error: `source insert: ${serr.message}` }, { status: 500 });

    let chunks = 0;
    let status = "ready";
    let fail = null;
    try {
      const r = await ingestUrl({ tenantId: tenant.id, sourceId, url, title });
      chunks = r.chunks;
    } catch (e) {
      status = "failed";
      fail = String(e);
    }
    await db.from("knowledge_sources").update({ status, chunk_count: chunks }).eq("id", sourceId);

    if (status === "failed") {
      return Response.json({ error: "ingest failed", detail: fail }, { status: 502 });
    }
    return Response.json({ sourceId, chunks, status });
  } catch (e) {
    console.error("ingest:", e);
    return Response.json({ error: "Failed to ingest" }, { status: 500 });
  }
}
