-- Growth + Pulse schema for Neon (free tier). Run once after provisioning:
--   psql "$DATABASE_URL" -f db/migrations/001_growth.sql
create table if not exists growth_docs (
  coll text not null,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists growth_docs_coll_created on growth_docs (coll, created_at desc);

create table if not exists contact_events (
  id text primary key,
  contact_id text not null,           -- lower-cased email for now
  type text not null,                 -- score_taken, blueprint_purchased, payment_failed, ...
  occurred_at timestamptz not null default now(),
  ref_id text,
  amount_cents integer,
  meta jsonb not null default '{}'::jsonb
);
create index if not exists contact_events_contact on contact_events (contact_id, occurred_at desc);
create index if not exists contact_events_type on contact_events (type, occurred_at desc);
