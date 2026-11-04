-- SUNDER referrals: credit the referrer on email confirmation, not at signup,
-- and block obvious self-referrals. Apply by hand in the Supabase SQL editor
-- after 008-010. Do not auto-apply on deploy.

alter table sunder_subscribers add column if not exists referral_credited_at timestamptz;
-- Rows referred before this migration were already credited at signup.
update sunder_subscribers set referral_credited_at = created_at
 where referred_by is not null and referral_credited_at is null;

-- Same mailbox check: lower case, drop +tag, and drop dots for Gmail.
create or replace function sunder_email_key(p_email text)
returns text language sql immutable as $$
  select case
    when position('@' in coalesce(p_email, '')) = 0 then lower(coalesce(p_email, ''))
    else (
      with parts as (
        select split_part(split_part(lower(p_email), '@', 1), '+', 1) as l, split_part(lower(p_email), '@', 2) as d
      )
      select case when d in ('gmail.com', 'googlemail.com') then replace(l, '.', '') || '@gmail.com' else l || '@' || d end from parts
    )
  end
$$;

-- Signup no longer credits anyone. It stores referred_by only when the
-- referrer exists, is not the same mailbox and did not sign up from the same IP.
create or replace function sunder_signup(
  p_first_name text, p_email text, p_source text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_utm_term text,
  p_headline_variant smallint, p_consent_text text, p_consent_version text,
  p_ip_hash text, p_user_agent text, p_referral_code text, p_referred_by text, p_update_token_hash text
) returns table (referral_code text, created boolean)
language plpgsql security definer set search_path = public as $$
declare v_ref text; v_new boolean := false; v_by text := nullif(p_referred_by, '');
begin
  if v_by is not null and not exists (
    select 1 from sunder_subscribers r
     where r.referral_code = v_by
       and sunder_email_key(r.email) <> sunder_email_key(p_email)
       and (r.ip_hash is null or p_ip_hash is null or r.ip_hash <> p_ip_hash)
  ) then
    v_by := null;
  end if;

  insert into sunder_subscribers (first_name, email, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    headline_variant, consent_text, consent_version, ip_hash, user_agent, referral_code, referred_by, update_token_hash)
  values (p_first_name, lower(p_email), p_source, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_headline_variant, p_consent_text, p_consent_version, p_ip_hash, p_user_agent, p_referral_code,
    v_by, p_update_token_hash)
  on conflict (email) do nothing
  returning sunder_subscribers.referral_code into v_ref;

  if v_ref is not null then
    v_new := true;
  else
    select s.referral_code into v_ref from sunder_subscribers s where s.email = lower(p_email);
  end if;
  return query select v_ref, v_new;
end $$;

-- Credit the referrer once, when the referred person confirms (cap 10).
create or replace function sunder_credit_referral(p_email text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_by text; v_ip text; v_key text;
begin
  update sunder_subscribers
     set referral_credited_at = now()
   where email = lower(p_email) and referred_by is not null and referral_credited_at is null
  returning referred_by, ip_hash, sunder_email_key(email) into v_by, v_ip, v_key;
  if v_by is null then return; end if;
  update sunder_subscribers r
     set referral_entries = least(r.referral_entries + 1, 10), updated_at = now()
   where r.referral_code = v_by and r.referral_entries < 10
     and sunder_email_key(r.email) <> v_key
     and (r.ip_hash is null or v_ip is null or r.ip_hash <> v_ip);
end $$;

-- Same as 009, plus the referral credit after a real pending -> confirmed change.
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
  perform sunder_credit_referral(p_email);
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

revoke all on function sunder_email_key(text) from public, anon, authenticated;
revoke all on function sunder_signup from public, anon, authenticated;
revoke all on function sunder_credit_referral(text) from public, anon, authenticated;
revoke all on function email_confirm_sunder(text) from public, anon, authenticated;
grant execute on function sunder_email_key(text) to service_role;
grant execute on function sunder_signup to service_role;
grant execute on function sunder_credit_referral(text) to service_role;
grant execute on function email_confirm_sunder(text) to service_role;

-- Rollback: re-run the sunder_signup body from 008 and email_confirm_sunder from 009,
-- then: drop function if exists sunder_credit_referral(text); drop function if exists sunder_email_key(text);
-- alter table sunder_subscribers drop column if exists referral_credited_at;
