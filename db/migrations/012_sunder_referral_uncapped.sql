-- SUNDER referrals: remove the 10-entry cap. Credit still happens once, on
-- confirm, with the self-referral block from 011. Admin flags > 25 for review.
-- Apply by hand in the Supabase SQL editor after 011. Do not auto-apply on deploy.

alter table sunder_subscribers drop constraint if exists sunder_subscribers_referral_entries_check;
alter table sunder_subscribers add constraint sunder_subscribers_referral_entries_check check (referral_entries >= 0);

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
     set referral_entries = r.referral_entries + 1, updated_at = now()
   where r.referral_code = v_by
     and sunder_email_key(r.email) <> v_key
     and (r.ip_hash is null or v_ip is null or r.ip_hash <> v_ip);
end $$;

revoke all on function sunder_credit_referral(text) from public, anon, authenticated;
grant execute on function sunder_credit_referral(text) to service_role;

-- Rollback: re-run sunder_credit_referral from 011, then
-- update sunder_subscribers set referral_entries = 10 where referral_entries > 10;
-- alter table sunder_subscribers drop constraint sunder_subscribers_referral_entries_check;
-- alter table sunder_subscribers add constraint sunder_subscribers_referral_entries_check check (referral_entries between 0 and 10);
