import { serviceClient } from "../../../../lib/agent-supabase";
import { getTenantBySlug } from "../../../../lib/agent-retrieval";

export const runtime = "nodejs";

/** ADMIN-gated: list agent personas for a tenant. GET /api/ai-agent/agents?slug=<slug> */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });
    const { data, error } = await serviceClient()
      .from("agents")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ agents: data ?? [] });
  } catch (e) {
    console.error("agents GET:", e);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

const AGENT_FIELDS = [
  "name",
  "type",
  "system_prompt",
  "allowed_actions",
  "knowledge_scope",
  "route_rule",
  "greeting",
  "model_tier",
  "active",
];

/** ADMIN-gated: create/update an agent persona. POST /api/ai-agent/agents */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug: string = body.slug;
    const id: string | null = body.id ?? null;
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });

    const row: Record<string, unknown> = { tenant_id: tenant.id, active: true, model_tier: "default" };
    for (const f of AGENT_FIELDS) if (body[f] !== undefined) row[f] = body[f];
    if (!row.type) return Response.json({ error: "type required" }, { status: 400 });
    if (!row.system_prompt) return Response.json({ error: "system_prompt required" }, { status: 400 });
    if (!id) row.id = `agt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const db = serviceClient();
    let res;
    if (id) {
      res = await db.from("agents").update(row).eq("id", id);
    } else {
      res = await db.from("agents").insert(row);
    }
    if (res.error) return Response.json({ error: res.error.message }, { status: 500 });
    const effId = (id ?? row.id) as string;
    const { data } = await db.from("agents").select("*").eq("id", effId);
    return Response.json({ agent: Array.isArray(data) ? data[0] ?? row : row });
  } catch (e) {
    console.error("agents POST:", e);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
