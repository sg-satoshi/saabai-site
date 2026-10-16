-- Split testing (experiments). Isolated schema in the existing Supabase project.
-- RLS on every table with NO policies: anon/authenticated can do nothing. All access is through
-- the two SECURITY DEFINER functions below, executable by service_role only (server routes).
create schema if not exists experiments;
revoke all on schema experiments from public, anon, authenticated;

create table if not exists experiments.experiment (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  site_key text not null,
  slot text not null,
  name text not null,
  status text not null default 'draft' check (status in ('draft','running','paused','won','archived')),
  lead_value_aud numeric(10,2),            -- optional; ROI is shown only when set
  started_at timestamptz, ended_at timestamptz,
  created_by text, created_at timestamptz not null default now()
);

create table if not exists experiments.variant (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null references experiments.experiment(key) on delete cascade,
  key text not null,
  label text not null,
  copy text not null,
  is_default boolean not null default false,
  active boolean not null default true,
  source text not null default 'human' check (source in ('human','ai')),
  approved_by text, approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (experiment_key, key)
);

create table if not exists experiments.event (
  id bigint generated always as identity primary key,
  experiment_key text not null,
  variant_key text not null,
  visitor_id uuid not null,
  type text not null check (type in ('impression','cta_click','form_submit','call_click','lead_alert')),
  day date not null default ((now() at time zone 'Australia/Brisbane')::date),
  created_at timestamptz not null default now(),
  unique (experiment_key, variant_key, visitor_id, type, day)
);
create index if not exists event_exp_variant_type on experiments.event (experiment_key, variant_key, type);

create table if not exists experiments.daily_stats (
  experiment_key text not null, variant_key text not null, day date not null,
  impressions int not null default 0, clicks int not null default 0, enquiries int not null default 0, calls int not null default 0,
  primary key (experiment_key, variant_key, day)
);

create table if not exists experiments.audit_log (
  id bigint generated always as identity primary key,
  experiment_key text, actor text, action text, detail jsonb, created_at timestamptz not null default now()
);

alter table experiments.experiment enable row level security;
alter table experiments.variant enable row level security;
alter table experiments.event enable row level security;
alter table experiments.daily_stats enable row level security;
alter table experiments.audit_log enable row level security;
revoke all on all tables in schema experiments from public, anon, authenticated;
revoke all on all sequences in schema experiments from public, anon, authenticated;

-- Record one deduped event. Ignores unknown experiments. Returns true when a new row was stored.
create or replace function public.exp_record_event(p_experiment text, p_variant text, p_visitor uuid, p_type text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not exists (select 1 from experiments.experiment where key = p_experiment and status = 'running') then return false; end if;
  if not exists (select 1 from experiments.variant where experiment_key = p_experiment and key = p_variant) then return false; end if;
  insert into experiments.event (experiment_key, variant_key, visitor_id, type)
  values (p_experiment, p_variant, p_visitor, p_type)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Per-variant counts of distinct visitors by event type.
create or replace function public.exp_stats(p_experiment text)
returns table (variant_key text, impressions bigint, cta_clicks bigint, enquiries bigint, calls bigint)
language sql security definer set search_path = '' as $$
  select v.key,
    count(distinct e.visitor_id) filter (where e.type = 'impression'),
    count(distinct e.visitor_id) filter (where e.type = 'cta_click'),
    count(distinct e.visitor_id) filter (where e.type = 'form_submit'),
    count(distinct e.visitor_id) filter (where e.type = 'call_click')
  from experiments.variant v
  left join experiments.event e on e.experiment_key = v.experiment_key and e.variant_key = v.key
  where v.experiment_key = p_experiment
  group by v.key order by v.key;
$$;

revoke all on function public.exp_record_event(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.exp_stats(text) from public, anon, authenticated;
grant execute on function public.exp_record_event(text, text, uuid, text) to service_role;
grant execute on function public.exp_stats(text) to service_role;
grant usage on schema experiments to service_role;
grant all on all tables in schema experiments to service_role;

-- Seed the first experiment (copy lives in Redis; these rows are the audit trail and the event allow-list).
insert into experiments.experiment (key, site_key, slot, name, status, started_at, created_by)
values ('home-hero-headline', 'saabai', 'home.hero.headline', 'saabai.ai homepage hero headline', 'running', now(), 'phase1')
on conflict (key) do nothing;
insert into experiments.variant (experiment_key, key, label, copy, is_default) values
 ('home-hero-headline','a','A (control)','Know exactly where AI will save your business hours, in 48 hours.', true),
 ('home-hero-headline','b','B','Stop guessing where AI fits. Get a clear plan for your business in 48 hours.', false),
 ('home-hero-headline','c','C','See which jobs AI can take off your plate, with a clear plan in 48 hours.', false)
on conflict (experiment_key, key) do nothing;
