/**
 * Saabai AI Agent — retrieval + persona helpers for the chat route.
 *
 * All tenant resolution is SERVER-side from a trusted `slug` (the widget never
 * supplies a tenant_id). Reads go through `tenantClient()` so RLS scopes every
 * query to the tenant (own rows + the shared, read-only 'industry' rows).
 *
 * RAG = in-app cosine similarity. We embed the query, pull the tenant's chunks
 * (which RLS already restricts to own + 'industry'), score them here, and return
 * the top k. This needs NO database function, so it works immediately and is
 * fine up to a few thousand chunks per tenant. For very large KBs the `match_knowledge`
 * pgvector function in docs/ai-agent-supabase-schema.sql is the scale-up path.
 */
import { serviceClient, tenantClient } from "./agent-supabase";
import { embedTexts } from "./agent-ingest";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  vertical?: string | null;
  plan?: string | null;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  system_prompt: string;
  allowed_actions?: unknown;
  model_tier?: string | null;
  greeting?: string | null;
}

export interface RetrievedChunk {
  id: string;
  tenant_id: string;
  source_id: string;
  content: string;
  similarity: number;
}

/** Resolve a tenant by slug — trusted server-side lookup (never client-supplied tenant_id). */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await serviceClient()
    .from("tenants")
    .select("id, slug, name, vertical, plan")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getTenantBySlug: ${error.message}`);
  return (data as Tenant) ?? null;
}

/** Load an active agent/persona for a tenant, optionally filtered by type. */
export async function getActiveAgent(tenantId: string, type?: string | null): Promise<Agent | null> {
  let q = serviceClient().from("agents").select("*").eq("tenant_id", tenantId).eq("active", true);
  if (type) q = q.eq("type", type);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`getActiveAgent: ${error.message}`);
  return (data as Agent) ?? null;
}

/** Parse a pgvector value that PostgREST may hand back as an array or a bracketed string. */
function parseVector(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("[")) {
      try {
        return JSON.parse(t.replace(/NaN/g, "0"));
      } catch {
        /* fall through to manual */
      }
    }
    return t
      .replace(/[\[\] ]/g, "")
      .split(",")
      .filter(Boolean)
      .map(Number);
  }
  return [];
}

/** Standard cosine similarity on two equal-length vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * RAG: embed the query, fetch the tenant's chunks (own + shared 'industry',
 * RLS-scoped via tenantClient), score by cosine similarity in-app, top k.
 */
export async function retrieve(tenantId: string, query: string, k = 6): Promise<RetrievedChunk[]> {
  const [qvec] = await embedTexts([query]);
  const { data: rows, error } = await tenantClient(tenantId)
    .from("knowledge_chunks")
    .select("id, tenant_id, source_id, content, embedding");
  if (error) throw new Error(`knowledge_chunks: ${error.message}`);
  if (!rows || rows.length === 0) return [];

  const scored = rows
    .map((r) => ({
      id: (r as any).id as string,
      tenant_id: (r as any).tenant_id as string,
      source_id: (r as any).source_id as string,
      content: (r as any).content as string,
      similarity: cosineSimilarity(qvec, parseVector((r as any).embedding)),
    }))
    .filter((c) => Number.isFinite(c.similarity) && c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return scored;
}
