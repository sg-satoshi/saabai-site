-- Lex v0 citation index (OALC snapshot).
--
-- Apply this by hand in the Sydney Supabase SQL editor when that project exists.
-- Do not apply it to any existing Supabase project. CI does not run it.
-- Nothing in the app connects here unless OALC_SUPABASE_URL and
-- OALC_SUPABASE_ANON_KEY are set. The loader (scripts/oalc-build-index.py load)
-- is a separate step and refuses to connect unless --confirm-write is passed.
--
-- The app role is read-only. service_role bypasses RLS in Supabase, so Lex
-- must use the anon key or a lex_app login, not the service role.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lex_app') then
    create role lex_app nologin;
  end if;
end $$;

create table if not exists public.oalc_citations (
  normalised_citation text primary key,
  citation text not null,
  source text not null check (source in ('NSW Caselaw', 'Federal Court', 'High Court')),
  jurisdiction text not null,
  date text,
  date_precision text not null check (date_precision in ('day', 'year', 'none')),
  url text not null,
  version_id text not null,
  constraint oalc_citations_date_shape check (
    (date_precision = 'day' and date ~ '^\d{4}-\d{2}-\d{2}$')
    or (date_precision = 'year' and date ~ '^\d{4}$')
    or (date_precision = 'none' and date is null)
  )
);

create index if not exists oalc_citations_url_idx
  on public.oalc_citations (url);

create index if not exists oalc_citations_citation_trgm_idx
  on public.oalc_citations
  using gin (normalised_citation extensions.gin_trgm_ops);

comment on table public.oalc_citations is
  'Licence-safe citation index. NSW and High Court rows are citation and link only. No judgment text is stored.';

create table if not exists public.oalc_citation_aliases (
  alias_url text primary key,
  normalised_citation text not null references public.oalc_citations (normalised_citation) on delete cascade,
  raw_citation text,
  version_id text
);

create index if not exists oalc_citation_aliases_norm_idx
  on public.oalc_citation_aliases (normalised_citation);

create table if not exists public.oalc_build_meta (
  id smallint primary key default 1 check (id = 1),
  corpus_version text not null,
  corpus_sha256 text not null,
  cutoff_date date not null,
  built_at timestamptz not null,
  citation_count integer not null,
  alias_count integer not null,
  source_counts jsonb not null
);

comment on table public.oalc_build_meta is
  'One row: which OALC snapshot the citation index was built from.';

-- Exact match is the primary key. Fuzzy match keeps the year, and for a
-- medium-neutral citation the court code and number, so a near miss cannot
-- resolve to a different case. Reported citations rely on similarity plus year.
create or replace function public.oalc_fuzzy_citation(q text)
returns table (
  normalised_citation text,
  citation text,
  source text,
  jurisdiction text,
  date text,
  date_precision text,
  url text,
  version_id text,
  similarity real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.normalised_citation,
    c.citation,
    c.source,
    c.jurisdiction,
    c.date,
    c.date_precision,
    c.url,
    c.version_id,
    similarity(c.normalised_citation, q)::real as similarity
  from public.oalc_citations c
  where q is not null
    and length(btrim(q)) > 0
    and similarity(c.normalised_citation, q) >= 0.80
    and (
      substring(q from '\[(\d{4})\]') is null
      or substring(c.normalised_citation from '\[(\d{4})\]') = substring(q from '\[(\d{4})\]')
    )
    and (
      substring(q from '\[[0-9]{4}\]\s+([A-Z0-9]+)\s+[0-9]') is null
      or substring(c.normalised_citation from '\[[0-9]{4}\]\s+([A-Z0-9]+)\s+[0-9]')
         = substring(q from '\[[0-9]{4}\]\s+([A-Z0-9]+)\s+[0-9]')
    )
    and (
      substring(q from '\[[0-9]{4}\]\s+[A-Z0-9]+\s+([0-9]+[A-Z]?)') is null
      or substring(c.normalised_citation from '\[[0-9]{4}\]\s+[A-Z0-9]+\s+([0-9]+[A-Z]?)')
         = substring(q from '\[[0-9]{4}\]\s+[A-Z0-9]+\s+([0-9]+[A-Z]?)')
    )
    and (
      substring(q from '\(((?:1[89]|20)[0-9]{2})\)') is null
      or substring(c.normalised_citation from '\(((?:1[89]|20)[0-9]{2})\)')
         = substring(q from '\(((?:1[89]|20)[0-9]{2})\)')
    )
  order by similarity(c.normalised_citation, q) desc
  limit 1;
$$;

alter table public.oalc_citations enable row level security;
alter table public.oalc_citation_aliases enable row level security;
alter table public.oalc_build_meta enable row level security;

drop policy if exists oalc_citations_read on public.oalc_citations;
create policy oalc_citations_read on public.oalc_citations
  for select to anon, authenticated, lex_app
  using (true);

drop policy if exists oalc_citation_aliases_read on public.oalc_citation_aliases;
create policy oalc_citation_aliases_read on public.oalc_citation_aliases
  for select to anon, authenticated, lex_app
  using (true);

drop policy if exists oalc_build_meta_read on public.oalc_build_meta;
create policy oalc_build_meta_read on public.oalc_build_meta
  for select to anon, authenticated, lex_app
  using (true);

revoke all on public.oalc_citations from public, anon, authenticated, lex_app;
revoke all on public.oalc_citation_aliases from public, anon, authenticated, lex_app;
revoke all on public.oalc_build_meta from public, anon, authenticated, lex_app;
grant select on public.oalc_citations to anon, authenticated, lex_app;
grant select on public.oalc_citation_aliases to anon, authenticated, lex_app;
grant select on public.oalc_build_meta to anon, authenticated, lex_app;

revoke all on function public.oalc_fuzzy_citation(text) from public;
grant execute on function public.oalc_fuzzy_citation(text) to anon, authenticated, lex_app;
