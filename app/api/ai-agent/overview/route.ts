import { serviceClient } from "../../../../lib/agent-supabase";
import { getTenantBySlug } from "../../../../lib/agent-retrieval";

export const runtime = "nodejs";

/** ADMIN-gated: portal Overview analytics. GET /api/ai-agent/overview?slug=<slug> */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });

    const db = serviceClient();
    const tid = tenant.id;

    const { data: convs } = await db.from("conversations").select("contained").eq("tenant_id", tid);
    const { data: msgs } = await db.from("messages").select("cost_est").eq("tenant_id", tid);
    const { data: leads } = await db.from("leads").select("id").eq("tenant_id", tid);
    const { data: sources } = await db
      .from("knowledge_sources")
      .select("id, status, chunk_count")
      .eq("tenant_id", tid);

    const convCount = convs?.length ?? 0;
    const contained = (convs ?? []).filter((c) => c.contained).length;
    const containedRate = convCount ? Math.round((contained / convCount) * 100) : 0;
    const cost = (msgs ?? []).reduce((s, m) => s + (Number(m.cost_est) || 0), 0);
    const leadCount = leads?.length ?? 0;
    const readySources = (sources ?? []).filter((s) => s.status === "ready").length;
    const totalChunks = (sources ?? []).reduce((s, x) => s + (Number(x.chunk_count) || 0), 0);

    return Response.json({
      tenant: { slug: tenant.slug, name: tenant.name, plan: tenant.plan },
      conversations: convCount,
      containedRate,
      messages: msgs?.length ?? 0,
      cost,
      leads: leadCount,
      sources: readySources,
      chunks: totalChunks,
    });
  } catch (e) {
    console.error("overview:", e);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
