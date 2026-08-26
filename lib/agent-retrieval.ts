/**
 * Saabai AI Agent — retrieval + persona helpers for the chat route.
 *
 * All tenant resolution is SERVER-side from a trusted `slug` (the widget never
 * supplies a tenant_id). Reads go through `tenantClient()` so RLS scopes every
 * query; the RAG search uses the `match_knowledge` pgvector function, which is
 * scoped by the JWT claim (own tenant + shared 'industry' rows).
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

/** RAG: embed the query, then run tenant-isolated pgvector similarity search (own + 'industry'). */
export async function retrieve(tenantId: string, query: string, k = 6): Promise<RetrievedChunk[]> {
  const [vec] = await embedTexts([query]);
  const { data, error } = await tenantClient(tenantId).rpc("match_knowledge", {
    query_embedding: vec,
    match_count: k,
  });
  if (error) throw new Error(`match_knowledge: ${error.message}`);
  return (data as RetrievedChunk[]) ?? [];
}
