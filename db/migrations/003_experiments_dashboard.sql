-- Split testing Phase 2: source attribution on events, dashboard stats functions, audited admin writes.
-- Same isolation rules as 002: no table policies, everything through SECURITY DEFINER functions granted to service_role only.
alter table experiments.event add column if not exists utm_source text;
alter table experiments.event add column if not exists utm_campaign text;
alter table experiments.event add column if not exists channel text;

-- Replace the 4-argument recorder with one that also stores a (non-PII) source label. First write per day wins.
drop function if exists public.exp_record_event(text, text, uuid, text);
create or replace function public.exp_record_event(p_experiment text, p_variant text, p_visitor uuid, p_type text,
  p_source text default null, p_campaign text default null, p_channel text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not exists (select 1 from experiments.experiment where key = p_experiment and status = 'running') then return false; end if;
  if not exists (select 1 from experiments.variant where experiment_key = p_experiment and key = p_variant) then return false; end if;
  insert into experiments.event (experiment_key, variant_key, visitor_id, type, utm_source, utm_campaign, channel)
  values (p_experiment, p_variant, p_visitor, p_type, left(p_source, 60), left(p_campaign, 60), left(p_channel, 30))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Per-variant distinct-visitor counts. "converters" = visitors with an enquiry OR a call.
drop function if exists public.exp_stats(text);
create or replace function public.exp_stats(p_experiment text)
returns table (variant_key text, impressions bigint, cta_clicks bigint, enquiries bigint, calls bigint, converters bigint)
language sql security definer set search_path = '' as $$
  select v.key,
    count(distinct e.visitor_id) filter (where e.type = 'impression'),
    count(distinct e.visitor_id) filter (where e.type = 'cta_click'),
    count(distinct e.visitor_id) filter (where e.type = 'form_submit'),
    count(distinct e.visitor_id) filter (where e.type = 'call_click'),
    count(distinct e.visitor_id) filter (where e.type in ('form_submit','call_click'))
  from experiments.variant v
  left join experiments.event e on e.experiment_key = v.experiment_key and e.variant_key = v.key
  where v.experiment_key = p_experiment
  group by v.key order by v.key;
$$;

-- Breakdown by how the visitor arrived (attributed to the source on their first event in the test).
create or replace function public.exp_stats_by(p_experiment text, p_dim text)
returns table (variant_key text, bucket text, impressions bigint, cta_clicks bigint, converters bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if p_dim not in ('channel','utm_source','utm_campaign') then raise exception 'bad dimension'; end if;
  return query
  with first_src as (
    select distinct on (e.visitor_id, e.variant_key) e.visitor_id as vid, e.variant_key as vk,
      case p_dim when 'channel' then coalesce(e.channel, 'not recorded')
                 when 'utm_source' then coalesce(e.utm_source, '(none)')
                 else coalesce(e.utm_campaign, '(none)') end as b
    from experiments.event e where e.experiment_key = p_experiment
    order by e.visitor_id, e.variant_key, e.created_at, e.id)
  select f.vk, f.b,
    count(distinct e.visitor_id) filter (where e.type = 'impression'),
    count(distinct e.visitor_id) filter (where e.type = 'cta_click'),
    count(distinct e.visitor_id) filter (where e.type in ('form_submit','call_click'))
  from first_src f
  join experiments.event e on e.experiment_key = p_experiment and e.visitor_id = f.vid and e.variant_key = f.vk
  group by f.vk, f.b order by f.vk, f.b;
end $$;

-- Daily trend (Brisbane days). The earliest day also tells the dashboard how long the test has run.
create or replace function public.exp_stats_daily(p_experiment text)
returns table (day date, variant_key text, impressions bigint, converters bigint)
language sql security definer set search_path = '' as $$
  select e.day, e.variant_key,
    count(*) filter (where e.type = 'impression'),
    count(*) filter (where e.type in ('form_submit','call_click'))
  from experiments.event e where e.experiment_key = p_experiment
  group by e.day, e.variant_key order by e.day, e.variant_key;
$$;

-- Audited admin write: upserts the experiment and its variants (the event allow-list) and logs the change, atomically.
create or replace function public.exp_admin_apply(p_key text, p_site text, p_slot text, p_name text, p_status text,
  p_lead numeric, p_variants jsonb, p_actor text, p_action text, p_detail jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if p_status not in ('draft','running','paused','won','archived') then raise exception 'bad status'; end if;
  insert into experiments.experiment (key, site_key, slot, name, status, lead_value_aud, started_at, created_by)
  values (p_key, p_site, p_slot, p_name, p_status, p_lead, case when p_status = 'running' then now() end, p_actor)
  on conflict (key) do update set
    status = excluded.status, name = excluded.name, lead_value_aud = excluded.lead_value_aud,
    started_at = coalesce(experiments.experiment.started_at, case when excluded.status = 'running' then now() end),
    ended_at = case when excluded.status = 'won' then now() else null end;
  for v in select * from jsonb_array_elements(p_variants) loop
    insert into experiments.variant (experiment_key, key, label, copy, is_default, active, source)
    values (p_key, v->>'key', v->>'label', v->>'copy', coalesce((v->>'is_default')::boolean, false), coalesce((v->>'active')::boolean, true), coalesce(v->>'source', 'human'))
    on conflict (experiment_key, key) do update set
      label = excluded.label, copy = excluded.copy, is_default = excluded.is_default, active = excluded.active;
  end loop;
  insert into experiments.audit_log (experiment_key, actor, action, detail) values (p_key, p_actor, p_action, p_detail);
end $$;

create or replace function public.exp_audit_list(p_experiment text, p_limit int default 30)
returns table (id bigint, actor text, action text, detail jsonb, created_at timestamptz)
language sql security definer set search_path = '' as $$
  select a.id, a.actor, a.action, a.detail, a.created_at from experiments.audit_log a
  where a.experiment_key = p_experiment order by a.id desc limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.exp_record_event(text, text, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.exp_stats(text) from public, anon, authenticated;
revoke all on function public.exp_stats_by(text, text) from public, anon, authenticated;
revoke all on function public.exp_stats_daily(text) from public, anon, authenticated;
revoke all on function public.exp_admin_apply(text, text, text, text, text, numeric, jsonb, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.exp_audit_list(text, int) from public, anon, authenticated;
grant execute on function public.exp_record_event(text, text, uuid, text, text, text, text) to service_role;
grant execute on function public.exp_stats(text) to service_role;
grant execute on function public.exp_stats_by(text, text) to service_role;
grant execute on function public.exp_stats_daily(text) to service_role;
grant execute on function public.exp_admin_apply(text, text, text, text, text, numeric, jsonb, text, text, jsonb) to service_role;
grant execute on function public.exp_audit_list(text, int) to service_role;
