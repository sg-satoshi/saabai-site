-- SUNDER consent evidence (Spam Act proof of consent).
-- MUST RUN BEFORE MERGING the PR that adds lib/consent-evidence.ts.
-- Apply by hand in the Supabase SQL editor (project sg-satoshi-agent). Do not auto-apply on deploy.
-- Additive only: new nullable columns, no data rewritten. Existing rows show "Not recorded".
--
-- Already stored before this migration (008/009): consent_text, consent_version, consent_at
-- (signup time), source (document.referrer), utm_*, ip_hash (salted hash, not the IP),
-- user_agent, referred_by, sms_consent_*, confirmed_at.
--
-- Added here. Coarse geo only (Vercel edge headers: country, region, city). Nothing more invasive.

alter table sunder_subscribers
  add column if not exists signup_ip text,
  add column if not exists signup_country text,
  add column if not exists signup_region text,
  add column if not exists signup_city text,
  add column if not exists page_url text,
  add column if not exists form_id text,
  add column if not exists confirm_ip text,
  add column if not exists confirm_user_agent text,
  add column if not exists confirm_country text,
  add column if not exists confirm_region text,
  add column if not exists confirm_city text,
  add column if not exists confirm_evidence_at timestamptz;

-- RLS is already on with no policies (008): service role only. Nothing to grant.

-- Rollback:
-- alter table sunder_subscribers drop column if exists signup_ip, drop column if exists signup_country,
--   drop column if exists signup_region, drop column if exists signup_city, drop column if exists page_url,
--   drop column if exists form_id, drop column if exists confirm_ip, drop column if exists confirm_user_agent,
--   drop column if exists confirm_country, drop column if exists confirm_region, drop column if exists confirm_city,
--   drop column if exists confirm_evidence_at;
