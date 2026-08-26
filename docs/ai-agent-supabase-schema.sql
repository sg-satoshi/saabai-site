-- =============================================================================
-- Saabai AI Agent Platform — Supabase / Postgres schema + Row-Level Security
-- -----------------------------------------------------------------------------
-- Tenants are isolated by a `tenant_id` column on every table + RLS policies.
-- RLS keys off a JWT claim (`tenant_id`) minted from our OWN session-token login
-- (decision B). No Supabase Auth auth-flow rework. One service_role key is used
-- ONLY by trusted internal cron/workers, never exposed to client requests.
-- Applies to Postgres >= 15. Requires the `pgvector` extension.
-- =============================================================================

create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- 1. TENANT (a business client). This is the isolation root.
-- -----------------------------------------------------------------------------
create table if not exists tenants (
  id            text primary key,            -- e.g. site slug or 'tn_<slug>'; also the RLS claim value
  slug          text unique not null,        -- embed key, URL-safe
  name          text not null,
  vertical      text,                        -- 'real-estate', 'plumbing', 'tradie', ...
  plan          text not null default 'free',-- free | investor | pro
  branding      jsonb not null default '{}', -- colors, avatar, widget title, greeting
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- the `id` MUST equal the tenant_id claim we mint, so RLS can bind the two.

-- -----------------------------------------------------------------------------
-- 2. AGENTS / PERSONAS (the "Customer Service agent, Sales agent, Booking...")
-- -----------------------------------------------------------------------------
create table if not exists agents (
  id              text primary key,
  tenant_id       text not null references tenants(id) on delete cascade,
  name            text not null,
  type            text not null,             -- 'sales' | 'cs' | 'booking' | 'concierge'
  system_prompt   text not null,
  allowed_actions jsonb not null default '[]', -- e.g. ["capture_lead","book_call","check_status"]
  knowledge_scope text,                      -- restrict retrieval to a source/vertical set
  route_rule      text,                      -- which page/context defaults to this persona
  greeting        text,
  model_tier      text not null default 'default',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists agents_tenant_idx on agents(tenant_id);

-- -----------------------------------------------------------------------------
-- 3. KNOWLEDGE SOURCES (what a client trains on)
-- -----------------------------------------------------------------------------
create table if not exists knowledge_sources (
  id          text primary key,
  tenant_id   text not null references tenants(id) on delete cascade,
  type        text not null,                 -- 'site' | 'doc' | 'faq' | 'industry_kb' | 'provided_url'
  url         text,                          -- for site/provided_url
  doc_type    text,                          -- 'pdf' | 'docx' | 'txt' | 'html' (for docs)
  file_url    text,                          -- provenance only: the file is NOT persisted, text is extracted once
  title       text,
  status      text not null default 'pending',-- pending | indexing | ready | failed
  chunk_count int not null default 0,
  last_crawled_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists knowledge_sources_tenant_idx on knowledge_sources(tenant_id);

-- -----------------------------------------------------------------------------
-- 4. KNOWLEDGE CHUNKS (the RAG store). Vector column is tenant-scoped too, so
--    retrieval can NEVER cross tenants.
-- -----------------------------------------------------------------------------
create table if not exists knowledge_chunks (
  id          text primary key,
  tenant_id   text not null references tenants(id) on delete cascade,
  source_id   text not null references knowledge_sources(id) on delete cascade,
  content     text not null,
  embedding   vector(1536),                  -- change dim to match your embedding model
  meta        jsonb not null default '{}',   -- url, heading, section, etc.
  created_at  timestamptz not null default now()
);
create index if not exists knowledge_chunks_tenant_idx on knowledge_chunks(tenant_id);
-- HNSW index for fast, accurate cosine similarity. `lists` tradeoff: lower = more accurate.
create index if not exists knowledge_chunks_embed_hnsw_idx
  on knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- 5. CONVERSATIONS
-- -----------------------------------------------------------------------------
create table if not exists conversations (
  id          text primary key,
  tenant_id   text not null references tenants(id) on delete cascade,
  agent_id    text references agents(id),
  channel     text not null default 'web',
  visitor_id  text,
  started_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolution  text,                          -- 'resolved' | 'escalated' | 'abandoned'
  contained   boolean                        -- true = agent handled it w/o human
);
create index if not exists conversations_tenant_idx on conversations(tenant_id);
create index if not exists conversations_agent_idx on conversations(agent_id);

-- -----------------------------------------------------------------------------
-- 6. MESSAGES
-- -----------------------------------------------------------------------------
create table if not exists messages (
  id              text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  tenant_id       text not null references tenants(id) on delete cascade,
  role            text not null,             -- 'user' | 'assistant' | 'system' | 'handoff'
  content         text not null,
  model           text,                      -- which model produced this turn
  prompt_tokens   int,                       -- input tokens (usage.prompt_tokens)
  completion_tokens int,                     -- output tokens (usage.completion_tokens)
  cost_est        numeric(10,6),             -- est. $ for this turn (needed for per-client COGS)
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages(conversation_id);
create index if not exists messages_tenant_idx on messages(tenant_id);

-- -----------------------------------------------------------------------------
-- 7. LEADS (captured during chat)
-- -----------------------------------------------------------------------------
create table if not exists leads (
  id              text primary key,
  tenant_id       text not null references tenants(id) on delete cascade,
  agent_id        text references agents(id),
  conversation_id text references conversations(id),
  name            text,
  phone           text,
  email           text,
  service         text,
  urgency         text,                      -- 'emergency' | 'soon' | 'quote'
  notes           text,
  status          text not null default 'new',
  notified        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists leads_tenant_idx on leads(tenant_id);

-- -----------------------------------------------------------------------------
-- 8. HANDOFFS (live chat / human escalation queue)
-- -----------------------------------------------------------------------------
create table if not exists handoffs (
  id              text primary key,
  tenant_id       text not null references tenants(id) on delete cascade,
  conversation_id text not null references conversations(id) on delete cascade,
  status          text not null default 'open', -- open | claimed | resolved
  assigned_to     text,                        -- directory user id of the human
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
create index if not exists handoffs_tenant_idx on handoffs(tenant_id);

-- -----------------------------------------------------------------------------
-- 9. ANALYTICS (daily rollup per tenant)
-- -----------------------------------------------------------------------------
create table if not exists analytics_daily (
  tenant_id      text not null references tenants(id) on delete cascade,
  day            date not null,
  conversations  int not null default 0,
  contained      int not null default 0,
  leads          int not null default 0,
  escalated      int not null default 0,
  csat           numeric(3,2),
  prompt_tokens  bigint not null default 0,
  completion_tokens bigint not null default 0,
  cost_est       numeric(14,6) not null default 0,  -- per-client COGS rollup = the actual margin driver
  primary key (tenant_id, day)
);

-- =============================================================================
-- ROW-LEVEL SECURITY — the actual multi-tenant guarantee
-- =============================================================================
-- Every read is auto-scoped to auth.jwt() ->> 'tenant_id' (decision B). The
-- claim is present ONLY when the client authenticated via our session.
--
-- Two isolation modes so the shared INDUSTRY knowledge base works without
-- breaking tenant separation:
--   * knowledge_chunks / knowledge_sources: a client can READ its own rows AND
--     the shared 'industry' rows (read-only), but can only WRITE its own.
--     Industry rows are owned by the reserved tenant id 'industry' and are only
--     written by service_role (index/crawl), never by a client.
--   * every other table: strict own-tenant read+write only.

-- Strict own-tenant policies (groups: agents, conversations, messages, leads,
-- handoffs, analytics_daily)
do $$
declare t text;
begin
  foreach t in array array[
    'agents','conversations','messages','leads','handoffs','analytics_daily'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy tenant_isolation on %I using (tenant_id = (auth.jwt() ->> ''tenant_id'')) with check (tenant_id = (auth.jwt() ->> ''tenant_id''))',
      t
    );
  end loop;
end $$;

-- Knowledge tables: read own + shared 'industry', write own only.
do $$
declare t text;
begin
  foreach t in array array['knowledge_chunks','knowledge_sources'] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy kb_read on %I for select using (tenant_id = (auth.jwt() ->> ''tenant_id'') or tenant_id = ''industry'')',
      t
    );
    execute format(
      'create policy kb_insert on %I for insert with check (tenant_id = (auth.jwt() ->> ''tenant_id''))',
      t
    );
    execute format(
      'create policy kb_update on %I for update using (tenant_id = (auth.jwt() ->> ''tenant_id'')) with check (tenant_id = (auth.jwt() ->> ''tenant_id''))',
      t
    );
    execute format(
      'create policy kb_delete on %I for delete using (tenant_id = (auth.jwt() ->> ''tenant_id''))',
      t
    );
  end loop;
end $$;

-- Tenants: an authenticated client may read (and update) only its own row.
alter table tenants enable row level security;
create policy tenant_self on tenants
  using (id = (auth.jwt() ->> 'tenant_id'))
  with check (id = (auth.jwt() ->> 'tenant_id'));

-- =============================================================================
-- ROLE GRANTS
-- =============================================================================
-- `authenticated` = the Postgres role our minted JWT carries (decision B).
-- RLS on every table scopes it to its own tenant_id; grant row access so the
-- policy (not a broad privilege) is what limits the data.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- DEFENSIVE: even if Supabase's "Automatically expose new tables" was left ON
-- during project creation (it grants default privileges to `anon`), strip ALL
-- access from the public anon role. The public widget never talks to the DB
-- directly — it goes through the server route, which mints the authenticated JWT.
revoke all on all tables in schema public from anon, public;
alter default privileges in schema public revoke all on tables from anon, public;
alter default privileges in schema public revoke all on sequences from anon, public;

-- `service_role` — internal cron / worker ONLY. NEVER minted to a client.
grant select, insert, update, delete on all tables in schema public to service_role;
-- RLS is bypassed for service_role by Postgres default (that role bypasses RLS).
-- Understand that this key is a full backdoor: store it server-side, never in the
-- widget, never behind a client-facing route without a trusted auth gate.

-- =============================================================================
-- RAG RETRIEVAL (pgvector similarity, tenant-isolated)
-- =============================================================================
-- Standard Supabase RAG function. SECURITY DEFINER so it can read chunks, but it
-- SCOPE the rows by the caller's JWT claim (auth.jwt() ->> 'tenant_id') — so a
-- client can only retrieve its own chunks + the shared 'industry' rows. Call via
-- tenantClient(tenantId).rpc('match_knowledge', {...}) so the JWT claim is present.
create or replace function match_knowledge(
  query_embedding vector(1536),
  match_count int default 6
) returns table (id text, tenant_id text, source_id text, content text, similarity float)
language sql security definer stable
as $$
  select
    kc.id,
    kc.tenant_id,
    kc.source_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.tenant_id = (auth.jwt() ->> 'tenant_id') or kc.tenant_id = 'industry'
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- =============================================================================
-- NOTES
-- =============================================================================
-- 1. embedding dim (1536) must match your embedding model. If switching models
--    (e.g. to a 3072-dim model), recreate the column + index, or store separately.
-- 2. tenant_id uses text to match the existing string-id world (slugs / tn_<slug>).
--    Switch to uuid for tenants if you prefer; keep the column type consistent.
-- 3. INDUSTRY KNOWLEDGE BASE (the reusable, compounding asset): owned by the
--    reserved tenant id 'industry'. A client's agent retrieves from BOTH its own
--    tenant AND the shared 'industry' tenant at query time (union), still isolated:
--    the kb_read policy allows a client to READ 'industry' rows but never write
--    them. Industry rows are written only by service_role (index/crawl). Verticals
--    are distinguished by a `vertical`/meta tag on the chunk, not by extra tenants.
--    Build once per vertical, sell to every client in it. This is the moat.
-- 4. DOC INGESTION (files are NOT stored): on upload, read/extract text from the
--    PDF/Word/doc (pdf-parse, mammoth, etc.), chunk, embed, and persist ONLY the
--    chunks in knowledge_chunks. knowledge_sources keeps a provenance row (title,
--    doc_type, status) but the raw file is discarded after extraction. No blob
--    storage needed. Guard large uploads with a size limit + serverless-timeout.
-- 5. handoffs table powers the Live Chat / human escalation queue (Engati-style
--    Agent Inbox). Confirm it's in P0.
-- 6. SERVER-SIDE TENANT RESOLUTION (security): the public widget posts { slug,
--    messages }. The SERVER looks up the tenant by slug (trusted, never supplied
--    by the client), mints the tenant-scoped JWT, and runs the query. The client
--    never carries a tenant_id, so it cannot be forged. RLS is the backstop.
