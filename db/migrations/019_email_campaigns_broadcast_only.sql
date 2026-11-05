-- 019: The campaigns list is one-off broadcasts only.
-- Welcome sends keep a series_step row for attribution. Those rows have no
-- message body. Editing the live welcome, confirm or referral copy is done
-- from the templates, which Campaigns now lists as Automated.
-- Apply by hand in the Supabase SQL editor. Safe to re-run.
-- Does not send email, and does not change any template copy.

create or replace function email_recent_campaigns(p_tenant text)
returns table (
  id uuid, name text, status text, created_at timestamptz, scheduled_at timestamptz,
  queued int, sent int, failed int, skipped int, pending int, unsubscribed int
)
language sql security definer set search_path = public as $$
  select c.id, c.name, c.status, c.created_at, c.scheduled_at,
    count(s.id)::int,
    count(s.id) filter (where s.status = 'sent')::int,
    count(s.id) filter (where s.status = 'failed')::int,
    count(s.id) filter (where s.status = 'skipped')::int,
    count(s.id) filter (where s.status in ('pending', 'sending'))::int,
    (select count(*)::int from email_suppressions u where u.campaign_id = c.id and u.reason ilike '%unsub%')
  from email_campaigns c
  join email_tenants t on t.id = c.tenant_id and t.slug = p_tenant
  left join email_sends s on s.campaign_id = c.id
  where c.kind = 'broadcast'
    and (c.request_key is null or c.request_key not like 'series:%')
  group by c.id
  order by c.created_at desc
  limit 20;
$$;

revoke all on function email_recent_campaigns(text) from public, anon, authenticated;
grant execute on function email_recent_campaigns(text) to service_role;
