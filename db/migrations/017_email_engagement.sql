-- 017: Email open and click tracking (delivery, first open, first click per send).
-- Apply by hand in the Supabase SQL editor. Safe to re-run. Does not send email or call AWS.
-- Events arrive from the SES configuration set via SNS at /api/email/ses-events.
-- Until SES open and click tracking is switched on, these columns simply stay empty.

alter table email_sends add column if not exists delivered_at timestamptz;
alter table email_sends add column if not exists first_open_at timestamptz;
alter table email_sends add column if not exists first_click_at timestamptz;

-- Events are matched by the SES message id saved at send time.
create index if not exists email_sends_ses_message_id_idx
  on email_sends (ses_message_id) where ses_message_id is not null;

-- Record one Delivery, Open or Click event. Keeps the earliest time, so a
-- repeated or out-of-order event never moves a timestamp or double counts.
-- An unknown message id, or a tenant tag that does not match the send, does nothing.
-- A click also counts as an open (images may be blocked) and as delivered.
create or replace function email_track_event(p_message_id text, p_type text, p_at timestamptz, p_tenant text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_message_id is null or btrim(p_message_id) = '' or p_type not in ('delivery', 'open', 'click') then
    return false;
  end if;
  update email_sends s
     set delivered_at = least(coalesce(s.delivered_at, p_at), p_at),
         first_open_at = case when p_type in ('open', 'click') then least(coalesce(s.first_open_at, p_at), p_at) else s.first_open_at end,
         first_click_at = case when p_type = 'click' then least(coalesce(s.first_click_at, p_at), p_at) else s.first_click_at end
   where s.ses_message_id = p_message_id
     and (p_tenant is null or s.tenant_id = (select t.id from email_tenants t where t.slug = p_tenant));
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Broadcast engagement for one tenant over the last p_days. Excludes confirm,
-- test and welcome series sends. Rates use tracked (delivered) sends only.
create or replace function email_engagement(p_tenant uuid, p_days int)
returns table (delivered bigint, opened bigint, clicked bigint)
language sql security definer set search_path = public as $$
  select count(*) filter (where s.delivered_at is not null or s.first_open_at is not null),
         count(*) filter (where s.first_open_at is not null),
         count(*) filter (where s.first_click_at is not null)
    from email_sends s
    join email_campaigns c on c.id = s.campaign_id and c.kind = 'broadcast' and c.tenant_id = s.tenant_id
   where s.tenant_id = p_tenant
     and s.kind = 'marketing'
     and s.status = 'sent'
     and s.sent_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
$$;

revoke all on function email_track_event(text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function email_engagement(uuid, int) from public, anon, authenticated;
grant execute on function email_track_event(text, text, timestamptz, text) to service_role;
grant execute on function email_engagement(uuid, int) to service_role;
