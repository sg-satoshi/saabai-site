-- SUNDER waitlist subscribers (sunder.com.au). Single opt-in.
-- Apply this by hand in the Supabase SQL editor. Do not auto-apply it on deploy.
-- RLS is on with no policies: only the service role (server routes) can read or write.

create table if not exists sunder_subscribers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 60),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  headline_variant smallint check (headline_variant in (1, 2)),
  consent_text text not null,
  consent_version text not null,
  consent_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  referral_code text not null,
  referred_by text,
  referral_entries int not null default 0 check (referral_entries between 0 and 10),
  update_token_hash text not null,
  mobile text,
  sms_consent boolean not null default false,
  sms_consent_at timestamptz,
  sms_consent_text text,
  launch_pref text check (launch_pref in ('outright', 'subscription', 'unsure')),
  launch_pref_at timestamptz
);

create unique index if not exists sunder_subscribers_email_key on sunder_subscribers (email);
create unique index if not exists sunder_subscribers_ref_key on sunder_subscribers (referral_code);
create unique index if not exists sunder_subscribers_token_key on sunder_subscribers (update_token_hash);
create index if not exists sunder_subscribers_created_idx on sunder_subscribers (created_at desc);
create index if not exists sunder_subscribers_referred_by_idx on sunder_subscribers (referred_by);

alter table sunder_subscribers enable row level security;
revoke all on sunder_subscribers from anon, authenticated;

-- Atomic signup: insert or return the existing row, and credit the referrer
-- (capped at 10) only when a new row is created by a different person.
create or replace function sunder_signup(
  p_first_name text, p_email text, p_source text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_utm_term text,
  p_headline_variant smallint, p_consent_text text, p_consent_version text,
  p_ip_hash text, p_user_agent text, p_referral_code text, p_referred_by text, p_update_token_hash text
) returns table (referral_code text, created boolean)
language plpgsql security definer set search_path = public as $$
declare v_ref text; v_new boolean := false;
begin
  insert into sunder_subscribers (first_name, email, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    headline_variant, consent_text, consent_version, ip_hash, user_agent, referral_code, referred_by, update_token_hash)
  values (p_first_name, lower(p_email), p_source, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_headline_variant, p_consent_text, p_consent_version, p_ip_hash, p_user_agent, p_referral_code,
    nullif(p_referred_by, ''), p_update_token_hash)
  on conflict (email) do nothing
  returning sunder_subscribers.referral_code into v_ref;

  if v_ref is not null then
    v_new := true;
    if p_referred_by is not null and p_referred_by <> '' and p_referred_by <> v_ref then
      update sunder_subscribers s
         set referral_entries = least(s.referral_entries + 1, 10), updated_at = now()
       where s.referral_code = p_referred_by and s.referral_entries < 10;
    end if;
  else
    select s.referral_code into v_ref from sunder_subscribers s where s.email = lower(p_email);
  end if;
  return query select v_ref, v_new;
end $$;

revoke all on function sunder_signup from public, anon, authenticated;
grant execute on function sunder_signup to service_role;
