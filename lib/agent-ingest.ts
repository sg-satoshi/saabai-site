/**
 * Saabai AI Agent — knowledge ingest pipeline.
 *
 * Turns a client's content (a web page / site, or a doc) into embedded chunks
 * in `knowledge_chunks`. Files are NOT persisted: text is extracted, chunked,
 * embedded (OpenAI text-embedding-3-small, 1536 dims), and ONLY the chunks are
 * written. The raw file is discarded after extraction.
 *
 * Writes go through `serviceClient()` (service_role — trusted, bypasses RLS)
 * because ingest is a server-side admin process. Reads/chat go through
 * `tenantClient()` (RLS-scoped) instead.
 */
import { serviceClient } from "./agent-supabase";

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536; // must match knowledge_chunks.embedding vector(1536)

/** Minimal deterministic id generator (no external dep). */
export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Strip HTML tags + collapse whitespace to plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Split text into chunks with overlap, on word boundaries. */
export function chunkText(text: string, chunkChars = 2000, overlap = 200): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let cur: string[] = [];
  let len = 0;
  for (const w of words) {
    if (len + w.length + 1 > chunkChars && cur.length) {
      chunks.push(cur.join(" "));
      // keep a tail overlap so context isn't lost between chunks
      const tail = cur.slice(-Math.ceil(overlap / 6)).join(" ");
      cur = tail ? tail.split(" ") : [];
      len = cur.join(" ").length;
    }
    cur.push(w);
    len += w.length + 1;
  }
  if (cur.length) chunks.push(cur.join(" "));
  return chunks.filter((c) => c.length > 40);
}

/** Embed a batch of texts via OpenAI /v1/embeddings. Returns arrays of numbers. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, dimensions: EMBED_DIM, input: texts }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data.map((d) => d.embedding);
}

/**
 * Fetch a page, extract text, chunk, embed, and write chunks to knowledge_chunks.
 * `sourceId` should reference a row in knowledge_sources (provenance/metadata).
 * Uses serviceClient() (trusted) — RLS is bypassed, tenant_id is explicit.
 */
export async function ingestUrl(params: {
  tenantId: string;
  sourceId: string;
  url: string;
  title?: string;
}): Promise<{ chunks: number; url: string }> {
  const res = await fetch(params.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SaabaiAgent/1.0)" },
  });
  if (!res.ok) throw new Error(`Fetch ${params.url} failed: ${res.status}`);
  const html = await res.text();
  const text = htmlToText(html);
  if (text.length < 40) return { chunks: 0, url: params.url };

  const chunks = chunkText(text);
  const vectors = await embedTexts(chunks);
  const supabase = serviceClient();

  const rows = chunks.map((c, i) => ({
    id: makeId("chunk"),
    tenant_id: params.tenantId,
    source_id: params.sourceId,
    content: c,
    embedding: vectors[i],
    meta: { url: params.url, title: params.title ?? null },
  }));

  const { error } = await supabase.from("knowledge_chunks").insert(rows);
  if (error) throw new Error(`Insert chunks failed: ${error.message}`);

  return { chunks: rows.length, url: params.url };
}
