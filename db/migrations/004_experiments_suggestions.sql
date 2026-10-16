-- Split testing Phase 3: AI-suggested variants (pending until a human approves) and weekly note support.
-- Same isolation rules as 002/003: RLS on, no policies, access only through SECURITY DEFINER functions granted to service_role.
-- A suggestion row is only a proposal. It never touches experiments.variant or what visitors see.
create table if not exists experiments.suggestion (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null references experiments.experiment(key) on delete cascade,
  batch_id uuid not null,
  text text not null,
  emphasis text not null default '',
  rationale text not null default '',
  status text not null default 'pending' check (status in ('pending','approving','approved','rejected')),
  model text,
  decided_by text, decided_at timestamptz, claimed_at timestamptz,
  variant_key text,                 -- set when approved: the variant it became
  created_at timestamptz not null default now()
);
create index if not exists suggestion_exp_status on experiments.suggestion (experiment_key, status, created_at desc);
alter table experiments.suggestion enable row level security;
revoke all on experiments.suggestion from public, anon, authenticated;

create or replace function public.exp_suggestion_add(p_experiment text, p_batch uuid, p_items jsonb, p_actor text, p_model text)
returns int language plpgsql security definer set search_path = '' as $$
declare i jsonb; n int := 0;
begin
  if not exists (select 1 from experiments.experiment where key = p_experiment) then raise exception 'unknown experiment'; end if;
  for i in select * from jsonb_array_elements(p_items) loop
    insert into experiments.suggestion (experiment_key, batch_id, text, emphasis, rationale, model)
    values (p_experiment, p_batch, left(i->>'text', 120), left(coalesce(i->>'emphasis', ''), 120), left(coalesce(i->>'rationale', ''), 300), p_model);
    n := n + 1;
  end loop;
  insert into experiments.audit_log (experiment_key, actor, action, detail)
  values (p_experiment, p_actor, 'ai_suggest', jsonb_build_object('batch', p_batch, 'count', n, 'model', p_model));
  return n;
end $$;

-- Pending first, then the 15 most recent decided ones.
create or replace function public.exp_suggestion_list(p_experiment text)
returns table (id uuid, text text, emphasis text, rationale text, status text, created_at timestamptz, decided_at timestamptz, variant_key text)
language sql security definer set search_path = '' as $$
  (select s.id, s.text, s.emphasis, s.rationale, s.status, s.created_at, s.decided_at, s.variant_key from experiments.suggestion s
    where s.experiment_key = p_experiment and s.status in ('pending','approving') order by s.created_at, s.id)
  union all
  (select s.id, s.text, s.emphasis, s.rationale, s.status, s.created_at, s.decided_at, s.variant_key from experiments.suggestion s
    where s.experiment_key = p_experiment and s.status in ('approved','rejected') order by s.decided_at desc nulls last limit 15);
$$;

-- Compare-and-set transition so two clicks cannot approve the same suggestion twice.
-- pending -> approving (claim), approving -> approved (done), approving -> pending (undo), pending -> rejected.
-- A claim older than 2 minutes counts as abandoned and can be taken again.
create or replace function public.exp_suggestion_set(p_id uuid, p_experiment text, p_from text, p_to text, p_actor text, p_variant text default null)
returns table (id uuid, text text, emphasis text, rationale text)
language plpgsql security definer set search_path = '' as $$
begin
  if (p_from, p_to) not in (('pending','approving'),('approving','approved'),('approving','pending'),('pending','rejected')) then raise exception 'bad transition'; end if;
  return query
  update experiments.suggestion s set
    status = p_to,
    claimed_at = case when p_to = 'approving' then now() else s.claimed_at end,
    decided_by = case when p_to in ('approved','rejected') then p_actor else s.decided_by end,
    decided_at = case when p_to in ('approved','rejected') then now() else s.decided_at end,
    variant_key = coalesce(p_variant, s.variant_key)
  where s.id = p_id and s.experiment_key = p_experiment
    and (s.status = p_from or (p_from = 'pending' and s.status = 'approving' and s.claimed_at < now() - interval '2 minutes'))
  returning s.id, s.text, s.emphasis, s.rationale;
end $$;

create or replace function public.exp_suggestion_last_batch_at(p_experiment text)
returns timestamptz language sql security definer set search_path = '' as $$
  select max(created_at) from experiments.suggestion where experiment_key = p_experiment;
$$;

create or replace function public.exp_audit_add(p_experiment text, p_actor text, p_action text, p_detail jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into experiments.audit_log (experiment_key, actor, action, detail) values (p_experiment, p_actor, p_action, p_detail);
$$;

revoke all on function public.exp_suggestion_add(text, uuid, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.exp_suggestion_list(text) from public, anon, authenticated;
revoke all on function public.exp_suggestion_set(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.exp_suggestion_last_batch_at(text) from public, anon, authenticated;
revoke all on function public.exp_audit_add(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.exp_suggestion_add(text, uuid, jsonb, text, text) to service_role;
grant execute on function public.exp_suggestion_list(text) to service_role;
grant execute on function public.exp_suggestion_set(uuid, text, text, text, text, text) to service_role;
grant execute on function public.exp_suggestion_last_batch_at(text) to service_role;
grant execute on function public.exp_audit_add(text, text, text, jsonb) to service_role;
grant all on experiments.suggestion to service_role;
