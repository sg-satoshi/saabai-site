-- Email marketing MVP (SUNDER broadcast + welcome series) on Amazon SES.
-- Apply by hand in the Supabase SQL editor. Do not auto-apply on deploy.
-- This does not send email and does not call AWS.
--
-- Follow-up (needs the saabai-ses-admin key, not the send-only key):
-- create config set cs-sunder, an SNS topic for Send/Delivery/Bounce/Complaint,
-- and set email_tenants.config_set. Until then, sends go out without a
-- configuration set. Suppression here is the unsubscribe list, not SES events.

-- Existing waitlist rows keep their express consent and stay mailable.
-- The column default then flips to pending so NEW signups are not marketed
-- until they confirm (double opt-in).
alter table sunder_subscribers add column if not exists marketing_status text;
update sunder_subscribers set marketing_status = 'confirmed' where marketing_status is null;
alter table sunder_subscribers alter column marketing_status set default 'pending';
alter table sunder_subscribers alter column marketing_status set not null;
alter table sunder_subscribers add column if not exists confirmed_at timestamptz;
update sunder_subscribers
   set confirmed_at = consent_at
 where marketing_status = 'confirmed' and confirmed_at is null;

do $$ begin
  alter table sunder_subscribers add constraint sunder_subscribers_marketing_status_check
    check (marketing_status in ('pending', 'confirmed', 'unsubscribed'));
exception when duplicate_object then null;
end $$;

create table if not exists email_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,30}$'),
  name text not null,
  domain text not null,
  from_name text not null,
  from_email text not null check (from_email = lower(from_email)),
  reply_to text,
  postal_address text not null,
  abn text not null,
  legal_name text not null,
  why_text text not null,
  config_set text,
  ses_tenant_name text,
  status text not null default 'ready' check (status in ('pending', 'ready', 'paused')),
  timezone text not null default 'Australia/Brisbane',
  created_at timestamptz not null default now()
);

create table if not exists email_settings (
  id text primary key,
  paused boolean not null default false
);

create table if not exists email_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references email_tenants(id),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  first_name text,
  status text not null check (status in ('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained')),
  consent_source text,
  consent_text text,
  consent_version text,
  consent_at timestamptz,
  consent_ip_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  source_table text,
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references email_tenants(id),
  name text not null,
  subject text not null,
  body_text text not null default '',
  html text not null default '',
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references email_tenants(id),
  kind text not null check (kind in ('broadcast', 'series_step', 'confirm', 'test')),
  name text not null default '',
  subject text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  request_key text unique,
  counts jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists email_series (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references email_tenants(id),
  slug text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  unique (tenant_id, slug)
);

create table if not exists email_series_steps (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references email_series(id),
  position int not null check (position >= 0 and position < 20),
  delay_minutes int not null check (delay_minutes >= 0 and delay_minutes <= 525600),
  template_id uuid not null references email_templates(id),
  unique (series_id, position)
);

create table if not exists email_series_enrolments (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references email_series(id),
  contact_id uuid not null references email_contacts(id),
  next_step int not null default 0,
  next_run_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'exited')),
  enrolled_at timestamptz not null default now(),
  unique (series_id, contact_id)
);

create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references email_tenants(id),
  campaign_id uuid references email_campaigns(id),
  contact_id uuid references email_contacts(id),
  to_email text not null check (to_email = lower(to_email)),
  kind text not null check (kind in ('marketing', 'confirm', 'test')),
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  subject text not null,
  html text not null,
  from_name text not null,
  respect_quiet boolean not null default false,
  ses_message_id text,
  error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists email_suppressions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references email_tenants(id),
  email text not null check (email = lower(email)),
  reason text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists email_suppressions_tenant_email
  on email_suppressions (tenant_id, email) where tenant_id is not null;
create unique index if not exists email_suppressions_global_email
  on email_suppressions (email) where tenant_id is null;
create index if not exists email_sends_pending_idx on email_sends (created_at) where status = 'pending';
create index if not exists email_series_due_idx on email_series_enrolments (next_run_at) where status = 'active';
create index if not exists email_contacts_tenant_status_idx on email_contacts (tenant_id, status);

alter table email_tenants enable row level security;
alter table email_settings enable row level security;
alter table email_contacts enable row level security;
alter table email_templates enable row level security;
alter table email_campaigns enable row level security;
alter table email_series enable row level security;
alter table email_series_steps enable row level security;
alter table email_series_enrolments enable row level security;
alter table email_sends enable row level security;
alter table email_suppressions enable row level security;

revoke all on email_tenants, email_settings, email_contacts, email_templates, email_campaigns,
  email_series, email_series_steps, email_series_enrolments, email_sends, email_suppressions
  from anon, authenticated;

insert into email_settings (id, paused) values ('global', false) on conflict (id) do nothing;

insert into email_tenants (
  slug, name, domain, from_name, from_email, reply_to, postal_address, abn, legal_name, why_text,
  config_set, ses_tenant_name, status
) values (
  'sunder', 'SUNDER', 'sunder.com.au', 'SUNDER', 'hello@sunder.com.au', 'hello@sunder.com.au',
  'Merrimac QLD 4226, Australia', '44 703 735 264', 'Saabai Pty Ltd trading as SUNDER',
  'you joined the SUNDER waitlist at sunder.com.au',
  null, 'sunder', 'ready'
) on conflict (slug) do nothing;

insert into email_templates (tenant_id, name, subject, body_text, html)
select t.id, v.name, v.subject, v.body, v.body
from email_tenants t
join (values
  ('welcome-1', 'You''re on the SUNDER list',
   E'Hi {{firstName|there}},\n\nYou''re confirmed. We''ll email you when SUNDER is ready, including launch offers and the giveaway.\n\nNothing else to do. If you want off the list, the link is at the bottom of every email.'),
  ('welcome-2', 'What SUNDER is',
   E'Hi {{firstName|there}},\n\nSUNDER is a new pickleball paddle. Power, spin and control, and a 12-month warranty on the core and edge.\n\nYou''re early. Launch details, the 20% off, and the giveaway go to this list first.'),
  ('welcome-3', 'We''ll write when it''s time',
   E'Hi {{firstName|there}},\n\nThis is the last note in the welcome. We won''t keep filling your inbox.\n\nWhen the launch date is set, you''ll get it here. Until then, your early access and 20% off stay on this email.')
) as v(name, subject, body) on true
where t.slug = 'sunder'
on conflict (tenant_id, name) do nothing;

insert into email_series (tenant_id, slug, name, status)
select id, 'welcome', 'SUNDER welcome', 'active' from email_tenants where slug = 'sunder'
on conflict (tenant_id, slug) do nothing;

insert into email_series_steps (series_id, position, delay_minutes, template_id)
select s.id, v.position, v.delay_minutes, tp.id
from email_series s
join email_tenants t on t.id = s.tenant_id and t.slug = 'sunder'
join (values (0, 0, 'welcome-1'), (1, 4320, 'welcome-2'), (2, 10080, 'welcome-3')) as v(position, delay_minutes, name) on true
join email_templates tp on tp.tenant_id = t.id and tp.name = v.name
where s.slug = 'welcome'
on conflict (series_id, position) do nothing;

-- Quiet hours: no series sends from 9pm to 7am Australia/Brisbane. 7:00am is allowed.
create or replace function email_after_quiet(ts timestamptz)
returns timestamptz
language plpgsql immutable as $$
declare local_ts timestamp; h int;
begin
  local_ts := ts at time zone 'Australia/Brisbane';
  h := extract(hour from local_ts)::int;
  if h >= 7 and h < 21 then return ts; end if;
  if h >= 21 then
    local_ts := date_trunc('day', local_ts) + interval '1 day' + interval '7 hours';
  else
    local_ts := date_trunc('day', local_ts) + interval '7 hours';
  end if;
  return local_ts at time zone 'Australia/Brisbane';
end $$;

create or replace function email_sync_sunder()
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into email_contacts (
    tenant_id, email, first_name, status, consent_source, consent_text, consent_version,
    consent_at, consent_ip_hash, confirmed_at, source_table, source_id, updated_at
  )
  select t.id, s.email, s.first_name,
    case s.marketing_status
      when 'confirmed' then 'subscribed'
      when 'unsubscribed' then 'unsubscribed'
      else 'pending'
    end,
    'sunder_waitlist', s.consent_text, s.consent_version, s.consent_at, s.ip_hash,
    case when s.marketing_status = 'confirmed' then coalesce(s.confirmed_at, s.consent_at) else null end,
    'sunder_subscribers', s.id, now()
  from sunder_subscribers s
  join email_tenants t on t.slug = 'sunder'
  on conflict (tenant_id, email) do update set
    first_name = excluded.first_name,
    status = case
      when email_contacts.status in ('bounced', 'complained', 'unsubscribed') then email_contacts.status
      else excluded.status
    end,
    confirmed_at = case
      when email_contacts.status in ('bounced', 'complained', 'unsubscribed') then email_contacts.confirmed_at
      else excluded.confirmed_at
    end,
    consent_text = excluded.consent_text,
    consent_version = excluded.consent_version,
    consent_at = excluded.consent_at,
    consent_ip_hash = excluded.consent_ip_hash,
    updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function email_confirm_sunder(p_email text)
returns text
language plpgsql security definer set search_path = public as $$
declare st text; n int;
begin
  select marketing_status into st from sunder_subscribers where email = lower(p_email);
  if st is null then return 'missing'; end if;
  if st = 'unsubscribed' then return 'unsubscribed'; end if;
  if st = 'confirmed' then return 'already'; end if;
  update sunder_subscribers
     set marketing_status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()), updated_at = now()
   where email = lower(p_email) and marketing_status = 'pending';
  get diagnostics n = row_count;
  if n = 0 then
    select marketing_status into st from sunder_subscribers where email = lower(p_email);
    if st = 'confirmed' then return 'already'; end if;
    if st = 'unsubscribed' then return 'unsubscribed'; end if;
    return 'missing';
  end if;
  perform email_sync_sunder();
  insert into email_series_enrolments (series_id, contact_id, next_step, next_run_at, status, enrolled_at)
  select s.id, c.id, 0,
         email_after_quiet(now() + make_interval(mins => coalesce(step0.delay_minutes, 0))),
         'active', now()
  from email_contacts c
  join email_tenants t on t.id = c.tenant_id and t.slug = 'sunder'
  join email_series s on s.tenant_id = t.id and s.slug = 'welcome'
  left join email_series_steps step0 on step0.series_id = s.id and step0.position = 0
  where c.email = lower(p_email) and c.status = 'subscribed'
  on conflict (series_id, contact_id) do nothing;
  return 'confirmed';
end $$;

create or replace function email_unsubscribe(p_tenant text, p_email text, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare tid uuid; addr text := lower(p_email);
begin
  select id into tid from email_tenants where slug = p_tenant;
  if tid is null then return; end if;
  if not exists (select 1 from email_suppressions where tenant_id = tid and email = addr) then
    insert into email_suppressions (tenant_id, email, reason)
    values (tid, addr, left(coalesce(nullif(btrim(p_reason), ''), 'unsubscribe'), 120));
  end if;
  update email_contacts
     set status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, now()), updated_at = now()
   where tenant_id = tid and email = addr;
  if p_tenant = 'sunder' then
    update sunder_subscribers set marketing_status = 'unsubscribed', updated_at = now() where email = addr;
  end if;
  update email_series_enrolments e set status = 'exited'
    from email_contacts c
   where e.contact_id = c.id and c.tenant_id = tid and c.email = addr and e.status = 'active';
  update email_sends
     set status = 'skipped', error = 'unsubscribed'
   where tenant_id = tid and to_email = addr and status = 'pending';
end $$;

-- Claim a batch. Skips paused tenants. When p_quiet is true, leaves series rows
-- (respect_quiet) pending so they go out after 7am Brisbane.
create or replace function email_claim_sends(p_limit int, p_quiet boolean)
returns setof email_sends
language plpgsql security definer set search_path = public as $$
begin
  return query
  update email_sends s
     set status = 'sending', claimed_at = now()
   where s.id in (
     select id from email_sends
      where status = 'pending'
        and tenant_id in (select id from email_tenants where status <> 'paused')
        and (respect_quiet = false or p_quiet = false)
      order by created_at
      for update skip locked
      limit greatest(1, least(coalesce(p_limit, 1), 40))
   )
  returning s.*;
end $$;

create or replace function email_fail_stuck_sends()
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update email_sends
     set status = 'failed', error = 'stuck_without_message_id'
   where status = 'sending' and ses_message_id is null and claimed_at < now() - interval '10 minutes';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function email_due_enrolments(p_limit int)
returns table (
  enrolment_id uuid,
  next_step int,
  enrolled_at timestamptz,
  contact_id uuid,
  contact_email text,
  first_name text,
  contact_status text,
  confirmed_at timestamptz,
  tenant_id uuid,
  from_name text,
  subject text,
  body_text text,
  html text,
  delay_minutes int,
  next_delay_minutes int
)
language sql security definer set search_path = public as $$
  select e.id, e.next_step, e.enrolled_at, c.id, c.email, c.first_name, c.status, c.confirmed_at,
         tn.id, tn.from_name, tp.subject, tp.body_text, tp.html, st.delay_minutes, nx.delay_minutes
  from email_series_enrolments e
  join email_series s on s.id = e.series_id and s.status = 'active'
  join email_tenants tn on tn.id = s.tenant_id and tn.status <> 'paused'
  join email_contacts c on c.id = e.contact_id
  join email_series_steps st on st.series_id = e.series_id and st.position = e.next_step
  join email_templates tp on tp.id = st.template_id
  left join email_series_steps nx on nx.series_id = e.series_id and nx.position = e.next_step + 1
  where e.status = 'active' and e.next_run_at <= now()
  order by e.next_run_at
  limit greatest(1, least(coalesce(p_limit, 1), 50));
$$;

create or replace function email_recent_campaigns(p_tenant text)
returns table (
  id uuid, name text, status text, created_at timestamptz,
  queued int, sent int, failed int, skipped int, pending int
)
language sql security definer set search_path = public as $$
  select c.id, c.name, c.status, c.created_at,
    count(s.id)::int,
    count(s.id) filter (where s.status = 'sent')::int,
    count(s.id) filter (where s.status = 'failed')::int,
    count(s.id) filter (where s.status = 'skipped')::int,
    count(s.id) filter (where s.status in ('pending', 'sending'))::int
  from email_campaigns c
  join email_tenants t on t.id = c.tenant_id and t.slug = p_tenant
  left join email_sends s on s.campaign_id = c.id
  group by c.id
  order by c.created_at desc
  limit 20;
$$;

revoke all on function email_after_quiet(timestamptz) from public, anon, authenticated;
revoke all on function email_sync_sunder() from public, anon, authenticated;
revoke all on function email_confirm_sunder(text) from public, anon, authenticated;
revoke all on function email_unsubscribe(text, text, text) from public, anon, authenticated;
revoke all on function email_claim_sends(int, boolean) from public, anon, authenticated;
revoke all on function email_fail_stuck_sends() from public, anon, authenticated;
revoke all on function email_due_enrolments(int) from public, anon, authenticated;
revoke all on function email_recent_campaigns(text) from public, anon, authenticated;

grant execute on function email_after_quiet(timestamptz) to service_role;
grant execute on function email_sync_sunder() to service_role;
grant execute on function email_confirm_sunder(text) to service_role;
grant execute on function email_unsubscribe(text, text, text) to service_role;
grant execute on function email_claim_sends(int, boolean) to service_role;
grant execute on function email_fail_stuck_sends() to service_role;
grant execute on function email_due_enrolments(int) to service_role;
grant execute on function email_recent_campaigns(text) to service_role;
