-- Chatbot list stats: engaged-chat reads and last message time.
-- Apply this by hand in the Supabase SQL editor. Do not auto-apply it on deploy.
--
-- Additive only. This file creates one index and two functions.
-- It does not alter, drop, or rewrite any existing column or row.
-- The whole-bot lock is not stored here. It is an optional field on the Redis
-- chatbot config (botLock). Configs written before that field stay unlocked.

create index if not exists messages_user_bot_created_idx
  on messages (bot_slug, created_at desc)
  where role = 'user';

-- User messages since p_since, for the engaged-chat count.
-- A lead is decided in application code (more than a greeting), not in this function,
-- and not from goal-click events.
create or replace function public.chatbot_user_turns(p_since timestamptz)
returns table (
  bot_slug text,
  conversation_id text,
  content text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.bot_slug, m.conversation_id, m.content, m.created_at
  from messages m
  where m.role = 'user'
    and m.bot_slug is not null
    and m.created_at >= p_since
$$;

create or replace function public.chatbot_last_chats()
returns table (
  bot_slug text,
  last_chat timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.bot_slug, max(m.created_at) as last_chat
  from messages m
  where m.bot_slug is not null
  group by m.bot_slug
$$;

revoke all on function public.chatbot_user_turns(timestamptz) from public, anon, authenticated;
revoke all on function public.chatbot_last_chats() from public, anon, authenticated;
grant execute on function public.chatbot_user_turns(timestamptz) to service_role;
grant execute on function public.chatbot_last_chats() to service_role;
