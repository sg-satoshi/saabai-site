-- Chat log for every Saabai bot (Mia, site bots, Lex, Rex, and the rest).
-- Extends the AI agent tables in docs/ai-agent-supabase-schema.sql.
-- Apply this by hand in the Supabase SQL editor. Do not auto-apply it on deploy.
--
-- Rows this logger writes set bot_slug. Older agent-ledger rows leave bot_slug null,
-- so the 90-day purge below does not delete them.

alter table conversations alter column tenant_id drop not null;
alter table messages alter column tenant_id drop not null;

alter table conversations
  add column if not exists bot_slug text,
  add column if not exists site_id text;

alter table messages
  add column if not exists bot_slug text,
  add column if not exists site_id text,
  add column if not exists input_tokens int,
  add column if not exists output_tokens int,
  add column if not exists cost_usd numeric(12,6);

-- Bot plus date, for the admin views and for the daily purge.
create index if not exists conversations_bot_started_idx
  on conversations (bot_slug, started_at desc);

create index if not exists messages_bot_created_idx
  on messages (bot_slug, created_at desc);

create index if not exists messages_created_idx
  on messages (created_at);

-- Deletes logger rows older than p_days (default 90).
-- Conversations are removed only when they have no messages left and no lead points at them.
create or replace function public.purge_chat_log(p_days int default 90)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  msg_count int;
  conv_count int;
  cutoff timestamptz;
begin
  if p_days is null or p_days < 1 then
    raise exception 'p_days must be at least 1';
  end if;
  cutoff := now() - make_interval(days => p_days);

  delete from messages
  where bot_slug is not null
    and created_at < cutoff;
  get diagnostics msg_count = row_count;

  delete from conversations c
  where c.bot_slug is not null
    and c.started_at < cutoff
    and not exists (select 1 from messages m where m.conversation_id = c.id)
    and not exists (select 1 from leads l where l.conversation_id = c.id);
  get diagnostics conv_count = row_count;

  return jsonb_build_object(
    'messages', msg_count,
    'conversations', conv_count,
    'cutoff', cutoff
  );
end $$;

revoke all on function public.purge_chat_log(int) from public, anon, authenticated;
grant execute on function public.purge_chat_log(int) to service_role;
