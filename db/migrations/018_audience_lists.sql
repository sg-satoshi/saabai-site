-- 018: Static audience lists for targeted broadcasts (SMS-ready later).
-- Apply by hand in the Supabase SQL editor. Safe to re-run. Does not send email or call AWS.
--
-- A list is a channel-agnostic snapshot of contact ids for one tenant.
-- Campaigns with list_id null keep the existing "all confirmed" audience.
-- Campaigns with a list_id send only to members who are still mailable
-- (subscribed, confirmed, not suppressed) at send time.
-- list_id uses ON DELETE RESTRICT so removing a list cannot silently widen a draft to everyone.

create table if not exists audience_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references email_tenants(id),
  name text not null default '',
  kind text not null default 'static' check (kind in ('static')),
  created_at timestamptz not null default now()
);

create table if not exists audience_list_members (
  list_id uuid not null references audience_lists(id) on delete cascade,
  contact_id uuid not null references email_contacts(id) on delete cascade,
  primary key (list_id, contact_id)
);

create index if not exists audience_lists_tenant_idx on audience_lists (tenant_id);
create index if not exists audience_list_members_contact_idx on audience_list_members (contact_id);

alter table email_campaigns add column if not exists list_id uuid references audience_lists(id) on delete restrict;
create index if not exists email_campaigns_list_id_idx on email_campaigns (list_id) where list_id is not null;

alter table audience_lists enable row level security;
alter table audience_list_members enable row level security;

revoke all on audience_lists, audience_list_members from anon, authenticated;
